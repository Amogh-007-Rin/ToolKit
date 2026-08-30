use anyhow::{Context, Result};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use sqlx::{PgPool, postgres::PgPoolOptions};
use std::time::Duration;

#[derive(sqlx::FromRow)]
struct Delivery { outbox_id: String, user_id: String, event_type: String, payload: Value, attempts: i32, device_id: String, expo_token: String, push_preview: bool }

#[derive(Serialize)]
struct ExpoMessage<'a> { to: &'a str, title: &'a str, body: String, data: &'a Value, sound: &'a str, priority: &'a str }

#[derive(Deserialize)]
struct ExpoEnvelope { data: ExpoTicket }
#[derive(Deserialize)]
struct ExpoTicket { status: String, id: Option<String>, details: Option<Value> }

#[tokio::main]
async fn main() -> Result<()> {
    dotenvy::dotenv().ok();
    tracing_subscriber::fmt().with_env_filter(std::env::var("LOG_LEVEL").unwrap_or_else(|_| "info".into())).init();
    let database_url = std::env::var("DATABASE_URL").context("DATABASE_URL is required")?;
    let pool = PgPoolOptions::new().max_connections(8).connect(&database_url).await?;
    let client = Client::builder().timeout(Duration::from_secs(15)).build()?;
    loop {
        if let Err(error) = deliver_batch(&pool, &client).await { tracing::error!(error = %error, "push batch failed"); }
        if let Err(error) = inspect_receipts(&pool, &client).await { tracing::error!(error = %error, "receipt inspection failed"); }
        tokio::time::sleep(Duration::from_secs(2)).await;
    }
}

async fn deliver_batch(pool: &PgPool, client: &Client) -> Result<()> {
    let rows = sqlx::query_as::<_, Delivery>(r#"SELECT o.id AS outbox_id, o."userId" AS user_id, o."eventType" AS event_type, o.payload, o.attempts, d.id AS device_id, d."expoToken" AS expo_token, u."pushPreview" AS push_preview FROM public."NotificationOutbox" o JOIN public."User" u ON u.id = o."userId" JOIN public."DeviceRegistration" d ON d."userId" = o."userId" AND d.enabled = true WHERE o."deliveredAt" IS NULL AND o."availableAt" <= NOW() AND u."pushEnabled" = true AND ((o."eventType" = 'message' AND u."notifyMessages" = true) OR (o."eventType" <> 'message' AND u."notifySocial" = true)) ORDER BY o."createdAt" LIMIT 50"#).fetch_all(pool).await?;
    for row in rows {
        let title = if row.event_type == "message" { "New message" } else { "ToolKit activity" };
        let body = if row.push_preview { row.payload.get("summary").and_then(Value::as_str).unwrap_or(title).chars().take(120).collect() } else { title.to_string() };
        let response = client.post("https://exp.host/--/api/v2/push/send").json(&ExpoMessage { to: &row.expo_token, title, body, data: &row.payload, sound: "default", priority: "high" }).send().await;
        match response {
            Ok(value) if value.status().is_success() => {
                let envelope: ExpoEnvelope = value.json().await?;
                let code = envelope.data.details.as_ref().and_then(|v| v.get("error")).and_then(Value::as_str);
                if code == Some("DeviceNotRegistered") { sqlx::query(r#"UPDATE public."DeviceRegistration" SET enabled = false WHERE id = $1"#).bind(&row.device_id).execute(pool).await?; }
                sqlx::query(r#"INSERT INTO public."PushReceipt" (id, "outboxId", "deviceId", "ticketId", status, "errorCode", "createdAt") VALUES ($1,$2,$3,$4,$5,$6,NOW()) ON CONFLICT ("outboxId","deviceId") DO UPDATE SET "ticketId"=EXCLUDED."ticketId", status=EXCLUDED.status, "errorCode"=EXCLUDED."errorCode""#).bind(uuid::Uuid::new_v4().to_string()).bind(&row.outbox_id).bind(&row.device_id).bind(envelope.data.id).bind(&envelope.data.status).bind(code).execute(pool).await?;
                sqlx::query(r#"UPDATE public."NotificationOutbox" SET "deliveredAt"=NOW() WHERE id=$1"#).bind(&row.outbox_id).execute(pool).await?;
            }
            Ok(value) if value.status().is_client_error() => { sqlx::query(r#"UPDATE public."NotificationOutbox" SET attempts=attempts+1, "lastError"='push rejected', "availableAt"=NOW()+INTERVAL '1 hour' WHERE id=$1"#).bind(&row.outbox_id).execute(pool).await?; }
            _ => { let delay = i64::from(2_i32.saturating_pow((row.attempts + 1).min(8) as u32)); sqlx::query(r#"UPDATE public."NotificationOutbox" SET attempts=attempts+1, "lastError"='transient delivery failure', "availableAt"=NOW()+($2 * INTERVAL '1 second') WHERE id=$1"#).bind(&row.outbox_id).bind(delay).execute(pool).await?; }
        }
    }
    Ok(())
}

async fn inspect_receipts(pool: &PgPool, client: &Client) -> Result<()> {
    let receipts: Vec<(String,)> = sqlx::query_as(r#"SELECT "ticketId" FROM public."PushReceipt" WHERE "ticketId" IS NOT NULL AND "checkedAt" IS NULL LIMIT 100"#).fetch_all(pool).await?;
    if receipts.is_empty() { return Ok(()); }
    let ids: Vec<&str> = receipts.iter().map(|row| row.0.as_str()).collect();
    let response = client.post("https://exp.host/--/api/v2/push/getReceipts").json(&json!({ "ids": ids })).send().await?;
    if !response.status().is_success() { return Ok(()); }
    let value: Value = response.json().await?;
    for id in ids { if let Some(receipt) = value.get("data").and_then(|d| d.get(id)) { let status = receipt.get("status").and_then(Value::as_str).unwrap_or("error"); let code = receipt.get("details").and_then(|d| d.get("error")).and_then(Value::as_str); sqlx::query(r#"UPDATE public."PushReceipt" SET status=$2, "errorCode"=$3, "checkedAt"=NOW() WHERE "ticketId"=$1"#).bind(id).bind(status).bind(code).execute(pool).await?; if code == Some("DeviceNotRegistered") { sqlx::query(r#"UPDATE public."DeviceRegistration" d SET enabled=false FROM public."PushReceipt" r WHERE r."ticketId"=$1 AND d.id=r."deviceId""#).bind(id).execute(pool).await?; } } }
    Ok(())
}
