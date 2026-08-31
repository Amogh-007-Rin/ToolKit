use crate::db::models::{Attachment, Message};
use serde::{Deserialize, Serialize};

pub const MAX_CONTENT_LEN: usize = 4000;
pub const MAX_ID_LEN: usize = 100;
pub const MAX_ATTACHMENTS: usize = 10;
pub const MAX_ATTACHMENT_KEY_LEN: usize = 500;
pub const MAX_ATTACHMENT_NAME_LEN: usize = 255;

pub fn content_policy_allows(content: &str, blocked_terms: &[String], max_links: usize) -> bool {
    let normalized = content.to_lowercase();
    if blocked_terms.iter().any(|term| {
        normalized
            .split(|character: char| !character.is_alphanumeric())
            .any(|word| word == term)
            || (term.contains(' ') && normalized.contains(term))
    }) {
        return false;
    }
    let links = normalized.matches("http://").count()
        + normalized.matches("https://").count()
        + normalized.matches("www.").count();
    if links > max_links {
        return false;
    }
    let mut previous = None;
    let mut repeated = 0;
    for character in normalized.chars() {
        if previous == Some(character) {
            repeated += 1;
            if repeated >= 11 {
                return false;
            }
        } else {
            repeated = 0;
            previous = Some(character);
        }
    }
    true
}

#[derive(Debug, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum ClientEvent {
    Heartbeat,
    #[serde(rename_all = "camelCase")]
    JoinRoom {
        room_id: String,
    },
    #[serde(rename_all = "camelCase")]
    LeaveRoom {
        room_id: String,
    },
    #[serde(rename_all = "camelCase")]
    SendMessage {
        room_id: String,
        #[serde(default)]
        temp_id: Option<String>,
        content: String,
        #[serde(default)]
        attachments: Vec<Attachment>,
    },
    #[serde(rename_all = "camelCase")]
    TypingStart {
        room_id: String,
    },
    #[serde(rename_all = "camelCase")]
    TypingStop {
        room_id: String,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum ServerEvent {
    #[serde(rename_all = "camelCase")]
    Connect {
        connection_id: String,
        user_id: String,
    },
    #[serde(rename_all = "camelCase")]
    Joined { room_id: String },
    #[serde(rename_all = "camelCase")]
    Left { room_id: String },
    #[serde(rename_all = "camelCase")]
    Message { message: Message },
    #[serde(rename_all = "camelCase")]
    MessageAck {
        room_id: String,
        temp_id: Option<String>,
        message_id: String,
        delivered: bool,
        error: Option<String>,
    },
    #[serde(rename_all = "camelCase")]
    TypingStart { room_id: String, user_id: String },
    #[serde(rename_all = "camelCase")]
    TypingStop { room_id: String, user_id: String },
    #[serde(rename_all = "camelCase")]
    Error { code: String, message: String },
    #[serde(rename_all = "camelCase")]
    UserOnline { user_id: String },
    #[serde(rename_all = "camelCase")]
    UserOffline {
        user_id: String,
        last_seen_at: String,
    },
}

impl ServerEvent {
    pub fn to_json(&self) -> String {
        serde_json::to_string(self).unwrap_or_else(|_| {
            "{\"type\":\"error\",\"code\":\"internal_error\",\"message\":\"failed to serialize event\"}"
                .to_string()
        })
    }

    pub fn exclude_user(&self) -> Option<&str> {
        match self {
            ServerEvent::TypingStart { user_id, .. } | ServerEvent::TypingStop { user_id, .. } => {
                Some(user_id)
            }
            _ => None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn serializes_events_with_camel_case_fields() {
        let json = ServerEvent::Joined {
            room_id: "room-1".into(),
        }
        .to_json();
        assert_eq!(json, r#"{"type":"joined","roomId":"room-1"}"#);
    }

    #[test]
    fn excludes_typing_event_author_only() {
        let event = ServerEvent::TypingStart {
            room_id: "room-1".into(),
            user_id: "user-1".into(),
        };
        assert_eq!(event.exclude_user(), Some("user-1"));
        assert_eq!(
            ServerEvent::Joined {
                room_id: "room-1".into()
            }
            .exclude_user(),
            None
        );
    }

    #[test]
    fn enforces_local_configurable_content_policy() {
        assert!(!content_policy_allows(
            "contains blockedword",
            &["blockedword".into()],
            4
        ));
        assert!(!content_policy_allows(
            "https://a.dev https://b.dev",
            &[],
            1
        ));
        assert!(!content_policy_allows("aaaaaaaaaaaa", &[], 4));
        assert!(content_policy_allows("ordinary private message", &[], 4));
    }
}
