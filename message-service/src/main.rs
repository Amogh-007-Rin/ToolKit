mod auth;
mod config;
mod db;
mod error;
mod pubsub;
mod routes;
mod state;
mod ws;

use crate::config::Config;
use crate::state::AppState;
use axum::http::{Method, header};
use std::sync::Arc;
use std::time::Duration;
use tokio::net::TcpListener;
use tower_http::cors::{AllowOrigin, CorsLayer};
use tower_http::trace::TraceLayer;
use tracing_subscriber::EnvFilter;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();

    let config = Config::from_env()?;

    let filter =
        EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new(&config.log_level));
    tracing_subscriber::fmt().with_env_filter(filter).init();

    let db_pool = db::connect(&config.database_url).await?;
    db::migrate(&db_pool).await?;
    tracing::info!("database ready");

    let redis = Arc::new(pubsub::RedisBus::connect(&config.redis_url).await?);
    tracing::info!("redis ready");

    let state = AppState::new(config.clone(), db_pool, redis.clone());
    {
        let listener_state = state.clone();
        let listener_redis = redis.clone();
        tokio::spawn(async move {
            listener_redis.listen(listener_state).await;
        });
    }

    let cors = match config.cors_origin.as_deref() {
        Some(origin) => CorsLayer::new()
            .allow_origin(AllowOrigin::list(
                origin
                    .split(',')
                    .filter_map(|value| value.trim().parse().ok()),
            ))
            .allow_methods([Method::GET, Method::POST])
            .allow_headers([header::CONTENT_TYPE, header::AUTHORIZATION]),
        None => CorsLayer::permissive(),
    };

    let app = routes::router()
        .merge(ws::router())
        .layer(cors)
        .layer(TraceLayer::new_for_http())
        .with_state(state.clone());

    let listener = TcpListener::bind((config.host.as_str(), config.port)).await?;
    tracing::info!(host = %config.host, port = config.port, "message service listening");

    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await?;

    tracing::info!("shutting down, closing websocket sessions");
    state.shutdown();
    tokio::time::sleep(Duration::from_millis(500)).await;
    Ok(())
}

async fn shutdown_signal() {
    #[cfg(unix)]
    {
        use tokio::signal::unix::{SignalKind, signal};
        let mut terminate = match signal(SignalKind::terminate()) {
            Ok(signal) => signal,
            Err(_) => {
                let _ = tokio::signal::ctrl_c().await;
                return;
            }
        };
        tokio::select! {
            _ = tokio::signal::ctrl_c() => {}
            _ = terminate.recv() => {}
        }
    }
    #[cfg(not(unix))]
    {
        let _ = tokio::signal::ctrl_c().await;
    }
}
