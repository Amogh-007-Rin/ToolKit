use crate::auth::{self, TokenQuery};
use crate::db;
use crate::db::models::{Message, Room};
use crate::error::AppError;
use crate::state::AppState;
use axum::extract::{Path, Query, State};
use axum::http::{HeaderMap, StatusCode};
use axum::routing::{get, post};
use axum::{Json, Router};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use std::collections::HashMap;

const DEFAULT_HISTORY_LIMIT: i64 = 50;
const MAX_HISTORY_LIMIT: i64 = 100;
const MAX_USER_ID_LEN: usize = 100;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MessagePreview {
    pub id: String,
    pub sender_id: String,
    pub content: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
pub struct RoomListItem {
    #[serde(flatten)]
    pub room: Room,
    pub members: Vec<String>,
    pub last_message: Option<MessagePreview>,
    pub unread_count: i64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DirectRoomRequest {
    pub user_id: String,
}

#[derive(Debug, Deserialize)]
pub struct MessagesQuery {
    pub before: Option<DateTime<Utc>>,
    pub limit: Option<i64>,
}

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/healthz", get(health))
        .route("/rooms", get(list_rooms))
        .route("/rooms/direct", post(create_direct_room))
        .route("/rooms/{room_id}/messages", get(room_messages))
        .route("/rooms/{room_id}/read", post(mark_read))
}

async fn health() -> Json<Value> {
    Json(json!({ "status": "ok" }))
}

async fn current_user(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(token_query): Query<TokenQuery>,
) -> Result<String, AppError> {
    auth::authenticate(headers, Query(token_query), &state.config.jwt_secret).await
}

async fn list_rooms(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(token_query): Query<TokenQuery>,
) -> Result<Json<Value>, AppError> {
    let user_id = current_user(State(state.clone()), headers, Query(token_query)).await?;

    let rows = db::list_rooms(&state.db, &user_id).await?;
    let room_ids: Vec<String> = rows.iter().map(|row| row.id.clone()).collect();
    let member_rows = db::room_members_for_rooms(&state.db, &room_ids).await?;
    let mut members_by_room: HashMap<String, Vec<String>> = HashMap::new();
    for member in member_rows {
        members_by_room
            .entry(member.room_id)
            .or_default()
            .push(member.user_id);
    }

    let rooms: Vec<RoomListItem> =
        rows.into_iter()
            .map(|row| {
                let room_id = row.id.clone();
                RoomListItem {
                    room: Room {
                        id: row.id,
                        kind: row.kind,
                        name: row.name,
                        created_by: row.created_by,
                        created_at: row.created_at,
                    },
                    members: members_by_room.get(&room_id).cloned().unwrap_or_default(),
                    last_message: row.last_message_id.as_ref().map(|last_message_id| {
                        MessagePreview {
                            id: last_message_id.clone(),
                            sender_id: row.last_message_sender_id.clone().unwrap_or_default(),
                            content: row.last_message_content.clone().unwrap_or_default(),
                            created_at: row.last_message_at.unwrap_or(Utc::now()),
                        }
                    }),
                    unread_count: row.unread_count,
                }
            })
            .collect();

    Ok(Json(json!({ "rooms": rooms })))
}

async fn create_direct_room(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(token_query): Query<TokenQuery>,
    Json(body): Json<DirectRoomRequest>,
) -> Result<(StatusCode, Json<Value>), AppError> {
    let user_id = current_user(State(state.clone()), headers, Query(token_query)).await?;

    let other = body.user_id.trim().to_string();
    if other.is_empty() || other.len() > MAX_USER_ID_LEN {
        return Err(AppError::BadRequest("user_id is invalid".to_string()));
    }
    if other == user_id {
        return Err(AppError::BadRequest(
            "cannot open a direct room with yourself".to_string(),
        ));
    }

    let room = db::find_or_create_direct_room(&state.db, &user_id, &other).await?;
    let members = db::room_member_ids(&state.db, &room.id).await?;

    Ok((
        StatusCode::OK,
        Json(
            json!({ "room": { "id": room.id, "kind": room.kind, "name": room.name, "createdBy": room.created_by, "createdAt": room.created_at, "members": members } }),
        ),
    ))
}

async fn room_messages(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(token_query): Query<TokenQuery>,
    Path(room_id): Path<String>,
    Query(messages_query): Query<MessagesQuery>,
) -> Result<Json<Value>, AppError> {
    let user_id = current_user(State(state.clone()), headers, Query(token_query)).await?;

    if !db::is_member(&state.db, &room_id, &user_id).await? {
        return Err(AppError::NotFound("room not found".to_string()));
    }

    let limit = messages_query
        .limit
        .unwrap_or(DEFAULT_HISTORY_LIMIT)
        .clamp(1, MAX_HISTORY_LIMIT);
    let messages: Vec<Message> =
        db::list_messages(&state.db, &room_id, messages_query.before, limit).await?;

    Ok(Json(json!({ "room_id": room_id, "messages": messages })))
}

async fn mark_read(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(token_query): Query<TokenQuery>,
    Path(room_id): Path<String>,
) -> Result<Json<Value>, AppError> {
    let user_id = current_user(State(state.clone()), headers, Query(token_query)).await?;

    if !db::is_member(&state.db, &room_id, &user_id).await? {
        return Err(AppError::NotFound("room not found".to_string()));
    }

    db::mark_read(&state.db, &room_id, &user_id).await?;
    Ok(Json(json!({ "ok": true, "room_id": room_id })))
}
