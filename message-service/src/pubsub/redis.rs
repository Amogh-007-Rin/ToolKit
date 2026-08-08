use crate::error::AppError;
use crate::state::AppState;
use crate::ws::messages::ServerEvent;
use futures_util::StreamExt;
use redis::AsyncCommands;
use redis::aio::ConnectionManager;
use std::sync::Arc;
use std::time::Duration;

const MAX_RECONNECT_DELAY: Duration = Duration::from_secs(30);

#[derive(Clone)]
pub struct RedisBus {
    client: redis::Client,
    publisher: ConnectionManager,
}

impl RedisBus {
    pub async fn connect(url: &str) -> Result<Self, AppError> {
        let client = redis::Client::open(url)?;
        let publisher = client.get_connection_manager().await?;
        Ok(Self { client, publisher })
    }

    pub async fn publish_room(&self, room_id: &str, payload: &str) -> Result<(), AppError> {
        let mut connection = self.publisher.clone();
        let _subscribers: usize = connection
            .publish(format!("room:{room_id}"), payload)
            .await?;
        Ok(())
    }

    pub async fn listen(self: Arc<Self>, state: AppState) {
        let mut delay = Duration::from_secs(1);
        loop {
            if let Err(error) = self.run_listener(&state).await {
                tracing::error!(%error, "redis pubsub listener disconnected");
            }
            tokio::time::sleep(delay).await;
            delay = (delay * 2).min(MAX_RECONNECT_DELAY);
        }
    }

    async fn run_listener(&self, state: &AppState) -> Result<(), AppError> {
        let mut pubsub = self.client.get_async_pubsub().await?;
        pubsub.psubscribe("room:*").await?;
        tracing::info!("subscribed to room:* channels");
        let mut stream = pubsub.into_on_message();
        while let Some(message) = stream.next().await {
            let channel = message.get_channel_name().to_string();
            let payload: String = message.get_payload()?;
            let room_id = channel.strip_prefix("room:").unwrap_or_default();
            if room_id.is_empty() {
                continue;
            }
            match serde_json::from_str::<ServerEvent>(&payload) {
                Ok(event) => state.deliver_to_room(room_id, event),
                Err(error) => {
                    tracing::warn!(%error, %room_id, "ignoring unparseable pubsub payload")
                }
            }
        }
        Err(AppError::Internal("pubsub stream ended".to_string()))
    }
}
