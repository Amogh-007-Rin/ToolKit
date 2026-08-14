use crate::db;
use crate::state::{AppState, ConnId, Outgoing};
use crate::ws::messages::{
    ClientEvent, MAX_ATTACHMENT_KEY_LEN, MAX_ATTACHMENT_NAME_LEN, MAX_ATTACHMENTS, MAX_CONTENT_LEN,
    MAX_ID_LEN, ServerEvent,
};
use axum::extract::ws::{Message, WebSocket};
use chrono::Utc;
use futures_util::{SinkExt, StreamExt};
use std::time::{Duration, Instant};
use tokio::sync::mpsc;
use uuid::Uuid;

const HEARTBEAT_INTERVAL: Duration = Duration::from_secs(15);
const CLIENT_TIMEOUT: Duration = Duration::from_secs(30);
const OUTBOUND_QUEUE_CAPACITY: usize = 256;

pub async fn run(state: AppState, socket: WebSocket, conn_id: ConnId, user_id: String) {
    let (mut sink, mut stream) = socket.split();
    let (tx, mut rx) = mpsc::channel::<Outgoing>(OUTBOUND_QUEUE_CAPACITY);

    state.register_session(conn_id, user_id.clone(), tx.clone());
    state.send_to_conn(
        conn_id,
        ServerEvent::Connect {
            connection_id: conn_id.to_string(),
            user_id: user_id.clone(),
        },
    );

    let send_task = tokio::spawn(async move {
        while let Some(outgoing) = rx.recv().await {
            let result = match outgoing {
                Outgoing::Event(event) => sink.send(Message::Text(event.to_json().into())).await,
                Outgoing::Ping => sink.send(Message::Ping(Default::default())).await,
                Outgoing::Close => {
                    let _ = sink.send(Message::Close(None)).await;
                    break;
                }
            };
            if result.is_err() {
                break;
            }
        }
    });

    let mut shutdown_rx = state.shutdown_rx();
    let mut heartbeat = tokio::time::interval(HEARTBEAT_INTERVAL);
    heartbeat.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Delay);
    let mut last_frame = Instant::now();

    loop {
        tokio::select! {
            _ = shutdown_rx.recv() => {
                let _ = tx.try_send(Outgoing::Close);
                break;
            }
            frame = stream.next() => {
                match frame {
                    Some(Ok(Message::Text(text))) => {
                        last_frame = Instant::now();
                        handle_client_event(&state, conn_id, text.as_str()).await;
                    }
                    Some(Ok(Message::Close(_))) => break,
                    Some(Ok(Message::Ping(_)))
                    | Some(Ok(Message::Pong(_)))
                    | Some(Ok(Message::Binary(_))) => {
                        last_frame = Instant::now();
                    }
                    Some(Err(_)) => break,
                    None => break,
                }
            }
            _ = heartbeat.tick() => {
                if last_frame.elapsed() >= CLIENT_TIMEOUT {
                    tracing::info!(%conn_id, %user_id, "dropping stale websocket connection");
                    let _ = tx.try_send(Outgoing::Close);
                    break;
                }
                if tx.try_send(Outgoing::Ping).is_err() {
                    tracing::warn!(%conn_id, %user_id, "closing saturated websocket connection");
                    break;
                }
            }
        }
    }

    let rooms_before_disconnect: Vec<String> = state
        .sessions
        .get(&conn_id)
        .map(|s| s.rooms.iter().map(|r| r.clone()).collect())
        .unwrap_or_default();

    state.remove_session(conn_id);

    let has_other_connections = state
        .sessions
        .iter()
        .any(|entry| entry.value().user_id == user_id);
    if !has_other_connections {
        let last_seen = Utc::now().to_rfc3339();
        for room in &rooms_before_disconnect {
            state.deliver_to_room(
                room,
                ServerEvent::UserOffline {
                    user_id: user_id.clone(),
                    last_seen_at: last_seen.clone(),
                },
            );
        }
    }

    send_task.abort();
}

async fn handle_client_event(state: &AppState, conn_id: ConnId, text: &str) {
    let event: ClientEvent = match serde_json::from_str(text) {
        Ok(event) => event,
        Err(error) => {
            send_error(
                state,
                conn_id,
                "invalid_event",
                format!("malformed event: {error}"),
            );
            return;
        }
    };

    let Some(session) = state.sessions.get(&conn_id) else {
        return;
    };
    let user_id = session.user_id.clone();
    drop(session);

    match event {
        ClientEvent::JoinRoom { room_id } => {
            if !valid_id(&room_id) {
                send_error(
                    state,
                    conn_id,
                    "invalid_room",
                    "invalid room id".to_string(),
                );
                return;
            }
            match db::is_member(&state.db, &room_id, &user_id).await {
                Ok(true) => {
                    let is_first_room = state
                        .sessions
                        .get(&conn_id)
                        .map(|s| s.rooms.is_empty())
                        .unwrap_or(true);
                    state.join_room(conn_id, &room_id);
                    state.touch_user(&user_id);
                    state.send_to_conn(
                        conn_id,
                        ServerEvent::Joined {
                            room_id: room_id.clone(),
                        },
                    );
                    if is_first_room {
                        state.deliver_to_room(
                            &room_id,
                            ServerEvent::UserOnline {
                                user_id: user_id.clone(),
                            },
                        );
                    }
                }
                Ok(false) => {
                    send_error(
                        state,
                        conn_id,
                        "not_member",
                        "you are not a member of this room".to_string(),
                    );
                }
                Err(error) => {
                    send_error(state, conn_id, "database_error", error.to_string());
                }
            }
        }
        ClientEvent::LeaveRoom { room_id } => {
            state.leave_room(conn_id, &room_id);
            state.send_to_conn(conn_id, ServerEvent::Left { room_id });
        }
        ClientEvent::SendMessage {
            room_id,
            temp_id,
            content,
            attachments,
        } => {
            handle_send_message(
                state,
                conn_id,
                &user_id,
                room_id,
                temp_id,
                content,
                attachments,
            )
            .await;
        }
        ClientEvent::TypingStart { room_id } => {
            handle_typing(state, conn_id, &user_id, room_id, true).await;
        }
        ClientEvent::TypingStop { room_id } => {
            handle_typing(state, conn_id, &user_id, room_id, false).await;
        }
    }
}

async fn handle_typing(
    state: &AppState,
    _conn_id: ConnId,
    user_id: &str,
    room_id: String,
    typing: bool,
) {
    if !valid_id(&room_id) {
        return;
    }
    match db::is_member(&state.db, &room_id, user_id).await {
        Ok(true) => {}
        Ok(false) => return,
        Err(error) => {
            tracing::warn!(%error, %room_id, %user_id, "failed to check membership for typing event");
            return;
        }
    }
    let event = if typing {
        ServerEvent::TypingStart {
            room_id: room_id.clone(),
            user_id: user_id.to_string(),
        }
    } else {
        ServerEvent::TypingStop {
            room_id: room_id.clone(),
            user_id: user_id.to_string(),
        }
    };
    let payload = event.to_json();
    if let Err(error) = state.redis.publish_room(&room_id, &payload).await {
        tracing::warn!(%error, %room_id, "failed to publish typing event, delivering locally");
        state.deliver_to_room(&room_id, event);
    }
}

async fn handle_send_message(
    state: &AppState,
    conn_id: ConnId,
    user_id: &str,
    room_id: String,
    temp_id: Option<String>,
    content: String,
    attachments: Vec<db::models::Attachment>,
) {
    if !valid_id(&room_id) {
        ack_failure(
            state,
            conn_id,
            &room_id,
            temp_id.as_deref(),
            "invalid room id",
        );
        return;
    }
    if let Some(temp_id) = temp_id.as_deref()
        && !valid_id(temp_id)
    {
        ack_failure(state, conn_id, &room_id, Some(temp_id), "invalid temp id");
        return;
    }
    if attachments.len() > MAX_ATTACHMENTS {
        ack_failure(
            state,
            conn_id,
            &room_id,
            temp_id.as_deref(),
            "too many attachments",
        );
        return;
    }
    for attachment in &attachments {
        if !valid_attachment(attachment) {
            ack_failure(
                state,
                conn_id,
                &room_id,
                temp_id.as_deref(),
                "invalid attachment",
            );
            return;
        }
    }
    let content = content.trim();
    if content.is_empty() && attachments.is_empty() {
        ack_failure(
            state,
            conn_id,
            &room_id,
            temp_id.as_deref(),
            "message cannot be empty",
        );
        return;
    }
    if content.len() > MAX_CONTENT_LEN {
        ack_failure(
            state,
            conn_id,
            &room_id,
            temp_id.as_deref(),
            "message is too long",
        );
        return;
    }

    match db::is_member(&state.db, &room_id, user_id).await {
        Ok(true) => {}
        Ok(false) => {
            ack_failure(
                state,
                conn_id,
                &room_id,
                temp_id.as_deref(),
                "you are not a member of this room",
            );
            return;
        }
        Err(error) => {
            tracing::warn!(%error, %room_id, %user_id, "failed to check room membership");
            ack_failure(
                state,
                conn_id,
                &room_id,
                temp_id.as_deref(),
                "unable to verify room membership",
            );
            return;
        }
    }

    match db::insert_message(
        &state.db,
        &Uuid::new_v4().to_string(),
        &room_id,
        user_id,
        content,
        &attachments,
    )
    .await
    {
        Ok(message) => {
            let message_id = message.id.clone();
            state.join_room(conn_id, &room_id);
            let event = ServerEvent::Message { message };
            let payload = event.to_json();
            if let Err(error) = state.redis.publish_room(&room_id, &payload).await {
                tracing::error!(%error, %room_id, "failed to publish message, delivering locally");
                state.deliver_to_room(&room_id, event);
            }
            state.send_to_conn(
                conn_id,
                ServerEvent::MessageAck {
                    room_id,
                    temp_id,
                    message_id,
                    delivered: true,
                    error: None,
                },
            );
        }
        Err(error) => {
            tracing::error!(%error, "failed to persist message");
            ack_failure(
                state,
                conn_id,
                &room_id,
                temp_id.as_deref(),
                "failed to persist message",
            );
        }
    }
}

fn ack_failure(
    state: &AppState,
    conn_id: ConnId,
    room_id: &str,
    temp_id: Option<&str>,
    error: &str,
) {
    state.send_to_conn(
        conn_id,
        ServerEvent::MessageAck {
            room_id: room_id.to_string(),
            temp_id: temp_id.map(str::to_string),
            message_id: String::new(),
            delivered: false,
            error: Some(error.to_string()),
        },
    );
}

fn send_error(state: &AppState, conn_id: ConnId, code: &str, message: String) {
    state.send_to_conn(
        conn_id,
        ServerEvent::Error {
            code: code.to_string(),
            message,
        },
    );
}

fn valid_id(id: &str) -> bool {
    !id.is_empty() && id.len() <= MAX_ID_LEN
}

fn valid_attachment(attachment: &db::models::Attachment) -> bool {
    if attachment.key.is_empty() || attachment.key.len() > MAX_ATTACHMENT_KEY_LEN {
        return false;
    }
    if attachment.kind != "image" && attachment.kind != "video" {
        return false;
    }
    if let Some(name) = attachment.name.as_deref()
        && name.len() > MAX_ATTACHMENT_NAME_LEN
    {
        return false;
    }
    true
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validates_identifiers_at_boundaries() {
        assert!(!valid_id(""));
        assert!(valid_id(&"a".repeat(MAX_ID_LEN)));
        assert!(!valid_id(&"a".repeat(MAX_ID_LEN + 1)));
    }

    #[test]
    fn validates_attachment_shape_and_limits() {
        let valid = db::models::Attachment {
            key: "chat/room/file.jpg".into(),
            kind: "image".into(),
            name: Some("file.jpg".into()),
        };
        assert!(valid_attachment(&valid));

        let mut invalid = valid.clone();
        invalid.kind = "document".into();
        assert!(!valid_attachment(&invalid));

        invalid = valid.clone();
        invalid.key = "a".repeat(MAX_ATTACHMENT_KEY_LEN + 1);
        assert!(!valid_attachment(&invalid));

        invalid = valid;
        invalid.name = Some("a".repeat(MAX_ATTACHMENT_NAME_LEN + 1));
        assert!(!valid_attachment(&invalid));
    }
}
