use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use sqlx::types::Json;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Attachment {
    pub key: String,
    pub kind: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Room {
    pub id: String,
    pub kind: String,
    pub name: Option<String>,
    pub created_by: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Message {
    pub id: String,
    pub room_id: String,
    pub sender_id: String,
    pub content: String,
    pub attachments: Json<Vec<Attachment>>,
    pub created_at: DateTime<Utc>,
    pub edited_at: Option<DateTime<Utc>>,
    pub deleted_at: Option<DateTime<Utc>>,
}

#[derive(Debug, FromRow)]
pub struct InsertedMessage {
    pub id: String,
    pub room_id: String,
    pub sender_id: String,
    pub content: String,
    pub attachments: Json<Vec<Attachment>>,
    pub created_at: DateTime<Utc>,
    pub edited_at: Option<DateTime<Utc>>,
    pub deleted_at: Option<DateTime<Utc>>,
    pub inserted: bool,
}

impl InsertedMessage {
    pub fn into_parts(self) -> (Message, bool) {
        let inserted = self.inserted;
        (
            Message {
                id: self.id,
                room_id: self.room_id,
                sender_id: self.sender_id,
                content: self.content,
                attachments: self.attachments,
                created_at: self.created_at,
                edited_at: self.edited_at,
                deleted_at: self.deleted_at,
            },
            inserted,
        )
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct RoomMember {
    pub room_id: String,
    pub user_id: String,
}

#[derive(Debug, Clone, FromRow)]
pub struct RoomSummaryRow {
    pub id: String,
    pub kind: String,
    pub name: Option<String>,
    pub created_by: String,
    pub created_at: DateTime<Utc>,
    pub last_message_id: Option<String>,
    pub last_message_sender_id: Option<String>,
    pub last_message_content: Option<String>,
    pub last_message_at: Option<DateTime<Utc>>,
    pub unread_count: i64,
}
