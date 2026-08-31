use crate::error::AppError;
use std::env;

#[derive(Debug, Clone)]
pub struct Config {
    pub host: String,
    pub port: u16,
    pub database_url: String,
    pub redis_url: String,
    pub jwt_secret: String,
    pub log_level: String,
    pub cors_origin: Option<String>,
    pub blocked_terms: Vec<String>,
    pub max_content_links: usize,
    pub message_rate_limit_per_minute: u32,
}

impl Config {
    pub fn from_env() -> Result<Self, AppError> {
        let database_url = env::var("DATABASE_URL")
            .map_err(|_| AppError::Config("DATABASE_URL is required".to_string()))?;
        let jwt_secret = env::var("JWT_SECRET")
            .map_err(|_| AppError::Config("JWT_SECRET is required".to_string()))?;
        let port = env::var("PORT")
            .ok()
            .and_then(|value| value.parse::<u16>().ok())
            .unwrap_or(8080);

        Ok(Self {
            host: env::var("HOST").unwrap_or_else(|_| "0.0.0.0".to_string()),
            port,
            database_url,
            redis_url: env::var("REDIS_URL")
                .unwrap_or_else(|_| "redis://127.0.0.1:6379".to_string()),
            jwt_secret,
            log_level: env::var("LOG_LEVEL").unwrap_or_else(|_| "info".to_string()),
            cors_origin: env::var("CORS_ORIGIN").ok(),
            blocked_terms: env::var("CONTENT_BLOCKED_TERMS")
                .unwrap_or_default()
                .split(',')
                .map(|term| term.trim().to_lowercase())
                .filter(|term| term.len() >= 2)
                .take(500)
                .collect(),
            max_content_links: env::var("CONTENT_MAX_LINKS")
                .ok()
                .and_then(|value| value.parse().ok())
                .unwrap_or(4),
            message_rate_limit_per_minute: env::var("MESSAGE_RATE_LIMIT_PER_MINUTE")
                .ok()
                .and_then(|value| value.parse().ok())
                .unwrap_or(30),
        })
    }
}
