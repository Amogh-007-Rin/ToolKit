pub mod models;

use crate::error::AppError;
use chrono::{DateTime, Utc};
use models::{InsertedMessage, Message, Room, RoomMember, RoomSummaryRow};
use sha2::{Digest, Sha256};
use sqlx::PgPool;
use sqlx::postgres::{PgConnectOptions, PgPoolOptions};
use sqlx::types::Json;
use std::collections::HashMap;
use std::str::FromStr;
use uuid::Uuid;

const SCHEMA: &str = "messaging";

pub async fn connect(url: &str) -> Result<PgPool, AppError> {
    let options = PgConnectOptions::from_str(url)?.options([("search_path", SCHEMA)]);
    Ok(PgPoolOptions::new()
        .max_connections(32)
        .connect_with(options)
        .await?)
}

pub async fn migrate(pool: &PgPool) -> Result<(), AppError> {
    let schema = include_str!("../../schema.sql");
    sqlx::raw_sql(schema).execute(pool).await?;
    Ok(())
}

pub async fn is_member(pool: &PgPool, room_id: &str, user_id: &str) -> Result<bool, AppError> {
    let exists: bool = sqlx::query_scalar(
        "SELECT EXISTS (SELECT 1 FROM room_members WHERE room_id = $1 AND user_id = $2)",
    )
    .bind(room_id)
    .bind(user_id)
    .fetch_one(pool)
    .await?;
    Ok(exists)
}

pub async fn users_blocked(pool: &PgPool, user_a: &str, user_b: &str) -> Result<bool, AppError> {
    let blocked: bool = sqlx::query_scalar("SELECT EXISTS (SELECT 1 FROM public.\"Block\" WHERE (\"blockerId\"=$1 AND \"blockedId\"=$2) OR (\"blockerId\"=$2 AND \"blockedId\"=$1))")
        .bind(user_a).bind(user_b).fetch_one(pool).await?;
    Ok(blocked)
}

pub async fn room_blocked_for_user(
    pool: &PgPool,
    room_id: &str,
    user_id: &str,
) -> Result<bool, AppError> {
    let blocked: bool = sqlx::query_scalar("SELECT EXISTS (SELECT 1 FROM room_members rm JOIN public.\"Block\" b ON ((b.\"blockerId\"=$2 AND b.\"blockedId\"=rm.user_id) OR (b.\"blockedId\"=$2 AND b.\"blockerId\"=rm.user_id)) WHERE rm.room_id=$1 AND rm.user_id<>$2)")
        .bind(room_id).bind(user_id).fetch_one(pool).await?;
    Ok(blocked)
}

pub async fn consume_realtime_ticket(
    pool: &PgPool,
    jti: &str,
    user_id: &str,
) -> Result<bool, AppError> {
    let jti_hash = hex::encode(Sha256::digest(jti.as_bytes()));
    let result = sqlx::query(
        "UPDATE public.\"RealtimeTicket\" SET \"consumedAt\" = NOW() WHERE \"jtiHash\" = $1 AND \"userId\" = $2 AND \"consumedAt\" IS NULL AND \"expiresAt\" > NOW()",
    )
    .bind(jti_hash)
    .bind(user_id)
    .execute(pool)
    .await?;
    Ok(result.rows_affected() == 1)
}

pub async fn user_active(pool: &PgPool, user_id: &str) -> Result<bool, AppError> {
    let active = sqlx::query_scalar::<_, bool>(
        "SELECT EXISTS (SELECT 1 FROM public.\"User\" WHERE id = $1 AND \"hiddenAt\" IS NULL AND \"suspendedAt\" IS NULL)",
    )
    .bind(user_id)
    .fetch_one(pool)
    .await?;
    Ok(active)
}

pub async fn set_user_last_seen(
    pool: &PgPool,
    user_id: &str,
    at: DateTime<Utc>,
) -> Result<(), AppError> {
    sqlx::query("INSERT INTO user_presence (user_id, last_seen_at) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET last_seen_at = EXCLUDED.last_seen_at")
        .bind(user_id)
        .bind(at)
        .execute(pool)
        .await?;
    Ok(())
}

pub async fn user_last_seen(
    pool: &PgPool,
    user_ids: &[String],
) -> Result<HashMap<String, DateTime<Utc>>, AppError> {
    if user_ids.is_empty() {
        return Ok(HashMap::new());
    }
    let rows = sqlx::query_as::<_, (String, DateTime<Utc>)>(
        "SELECT user_id, last_seen_at FROM user_presence WHERE user_id = ANY($1)",
    )
    .bind(user_ids)
    .fetch_all(pool)
    .await?;
    Ok(rows.into_iter().collect())
}

pub async fn find_or_create_direct_room(
    pool: &PgPool,
    user_a: &str,
    user_b: &str,
) -> Result<Room, AppError> {
    let room_id = direct_room_id(user_a, user_b);
    sqlx::query(
        "INSERT INTO rooms (id, kind, created_by) VALUES ($1, 'direct', $2) ON CONFLICT (id) DO NOTHING",
    )
    .bind(&room_id)
    .bind(user_a)
    .execute(pool)
    .await?;
    sqlx::query(
        "INSERT INTO room_members (room_id, user_id) VALUES ($1, $2), ($1, $3) ON CONFLICT (room_id, user_id) DO NOTHING",
    )
    .bind(&room_id)
    .bind(user_a)
    .bind(user_b)
    .execute(pool)
    .await?;
    room_by_id(pool, &room_id).await
}

pub async fn room_by_id(pool: &PgPool, room_id: &str) -> Result<Room, AppError> {
    let room = sqlx::query_as::<_, Room>(
        "SELECT id, kind, name, created_by, created_at FROM rooms WHERE id = $1",
    )
    .bind(room_id)
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| AppError::NotFound("room not found".to_string()))?;
    Ok(room)
}

pub async fn room_member_ids(pool: &PgPool, room_id: &str) -> Result<Vec<String>, AppError> {
    let rows =
        sqlx::query_scalar::<_, String>("SELECT user_id FROM room_members WHERE room_id = $1")
            .bind(room_id)
            .fetch_all(pool)
            .await?;
    Ok(rows)
}

pub async fn room_members_for_rooms(
    pool: &PgPool,
    room_ids: &[String],
) -> Result<Vec<RoomMember>, AppError> {
    if room_ids.is_empty() {
        return Ok(Vec::new());
    }
    let rows = sqlx::query_as::<_, RoomMember>(
        "SELECT room_id, user_id FROM room_members WHERE room_id = ANY($1)",
    )
    .bind(room_ids)
    .fetch_all(pool)
    .await?;
    Ok(rows)
}

pub async fn list_rooms(pool: &PgPool, user_id: &str) -> Result<Vec<RoomSummaryRow>, AppError> {
    let rows = sqlx::query_as::<_, RoomSummaryRow>(
        "SELECT
             r.id, r.kind, r.name, r.created_by, r.created_at,
             m.last_message_id, m.last_message_sender_id, m.last_message_content, m.last_message_at,
             COALESCE(u.unread_count, 0) AS unread_count
         FROM rooms r
         JOIN room_members rm ON rm.room_id = r.id
         LEFT JOIN LATERAL (
             SELECT msg.id AS last_message_id, msg.sender_id AS last_message_sender_id,
                    msg.content AS last_message_content, msg.created_at AS last_message_at
             FROM messages msg
             WHERE msg.room_id = r.id AND msg.deleted_at IS NULL
             ORDER BY msg.created_at DESC
             LIMIT 1
         ) m ON TRUE
         LEFT JOIN LATERAL (
             SELECT COUNT(*) AS unread_count
             FROM messages msg
             WHERE msg.room_id = r.id AND msg.sender_id <> $1 AND msg.deleted_at IS NULL
               AND msg.created_at > rm.last_read_at
         ) u ON TRUE
         WHERE rm.user_id = $1
         ORDER BY COALESCE(m.last_message_at, r.created_at) DESC",
    )
    .bind(user_id)
    .fetch_all(pool)
    .await?;
    Ok(rows)
}

pub async fn list_messages(
    pool: &PgPool,
    room_id: &str,
    before: Option<DateTime<Utc>>,
    limit: i64,
) -> Result<Vec<Message>, AppError> {
    let mut rows = sqlx::query_as::<_, Message>(
        "SELECT id, room_id, sender_id, content, COALESCE(attachments, '[]'::jsonb) AS attachments,
                created_at, edited_at, deleted_at
         FROM messages
         WHERE room_id = $1 AND deleted_at IS NULL AND ($2::timestamptz IS NULL OR created_at < $2)
         ORDER BY created_at DESC
         LIMIT $3",
    )
    .bind(room_id)
    .bind(before)
    .bind(limit)
    .fetch_all(pool)
    .await?;
    rows.reverse();
    Ok(rows)
}

pub async fn insert_message(
    pool: &PgPool,
    id: &str,
    room_id: &str,
    sender_id: &str,
    client_id: Option<&str>,
    content: &str,
    attachments: &[models::Attachment],
) -> Result<(Message, bool), AppError> {
    let mut tx = pool.begin().await?;
    let inserted = sqlx::query_as::<_, InsertedMessage>(
        "INSERT INTO messages (id, room_id, sender_id, client_id, content, attachments)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (sender_id, client_id) WHERE client_id IS NOT NULL
         DO UPDATE SET client_id = EXCLUDED.client_id
         RETURNING id, room_id, sender_id, content, COALESCE(attachments, '[]'::jsonb) AS attachments,
                   created_at, edited_at, deleted_at, (xmax = 0) AS inserted",
    )
    .bind(id)
    .bind(room_id)
    .bind(sender_id)
    .bind(client_id)
    .bind(content)
    .bind(Json(attachments))
    .fetch_one(&mut *tx)
    .await?;
    let (message, was_inserted) = inserted.into_parts();
    if was_inserted {
        let recipients: Vec<String> = sqlx::query_scalar(
            "SELECT user_id FROM room_members WHERE room_id = $1 AND user_id <> $2",
        )
        .bind(room_id)
        .bind(sender_id)
        .fetch_all(&mut *tx)
        .await?;
        for recipient in recipients {
            let outbox_id = Uuid::new_v4().to_string();
            let payload = serde_json::json!({ "roomId": room_id, "messageId": message.id, "senderId": sender_id, "summary": "New message" });
            sqlx::query("INSERT INTO public.\"NotificationOutbox\" (id, \"userId\", \"eventType\", payload, \"dedupeKey\", attempts, \"availableAt\", \"createdAt\") VALUES ($1, $2, 'message', $3, $4, 0, NOW(), NOW()) ON CONFLICT (\"dedupeKey\") DO NOTHING")
                .bind(outbox_id).bind(recipient).bind(payload).bind(format!("message:{}", message.id))
                .execute(&mut *tx).await?;
        }
    }
    tx.commit().await?;
    Ok((message, was_inserted))
}

pub async fn mark_read(pool: &PgPool, room_id: &str, user_id: &str) -> Result<(), AppError> {
    sqlx::query("UPDATE room_members SET last_read_at = NOW() WHERE room_id = $1 AND user_id = $2")
        .bind(room_id)
        .bind(user_id)
        .execute(pool)
        .await?;
    Ok(())
}

fn direct_room_id(user_a: &str, user_b: &str) -> String {
    let (first, second) = if user_a < user_b {
        (user_a, user_b)
    } else {
        (user_b, user_a)
    };
    let mut hasher = Sha256::new();
    hasher.update(first.as_bytes());
    hasher.update(b":");
    hasher.update(second.as_bytes());
    let digest = hasher.finalize();
    format!("dm_{}", hex::encode(&digest[..16]))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn direct_room_id_is_deterministic_and_order_independent() {
        let a = "user-b";
        let b = "user-a";
        let ab = direct_room_id(a, b);
        let ba = direct_room_id(b, a);
        assert_eq!(ab, ba);
        assert!(ab.starts_with("dm_"));
        assert_eq!(ab.len(), 35);
    }

    #[test]
    fn direct_room_id_differs_between_pairs() {
        assert_ne!(
            direct_room_id("user-a", "user-b"),
            direct_room_id("user-a", "user-c")
        );
    }
}
