use crate::db::models::{Attachment, Message};
use serde::{Deserialize, Serialize};

pub const MAX_CONTENT_LEN: usize = 4000;
pub const MAX_ID_LEN: usize = 100;
pub const MAX_ATTACHMENTS: usize = 10;
pub const MAX_ATTACHMENT_KEY_LEN: usize = 500;
pub const MAX_ATTACHMENT_NAME_LEN: usize = 255;

#[derive(Debug, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum ClientEvent {
    #[serde(rename_all = "camelCase")]
    JoinRoom { room_id: String },
    #[serde(rename_all = "camelCase")]
    LeaveRoom { room_id: String },
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
    TypingStart { room_id: String },
    #[serde(rename_all = "camelCase")]
    TypingStop { room_id: String },
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
