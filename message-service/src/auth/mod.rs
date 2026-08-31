pub mod jwt;

use crate::error::AppError;
use axum::extract::Query;
use axum::http::HeaderMap;
use serde::Deserialize;
use sqlx::PgPool;

#[derive(Debug, Deserialize)]
pub struct TokenQuery {
    pub token: Option<String>,
}

#[cfg(test)]
fn extract_token(headers: &HeaderMap, query: &TokenQuery) -> Option<String> {
    if let Some(token) = query.token.as_deref() {
        return Some(token.to_string());
    }
    headers
        .get(axum::http::header::AUTHORIZATION)
        .and_then(|value| value.to_str().ok())
        .and_then(|value| {
            value
                .strip_prefix("Bearer ")
                .or_else(|| value.strip_prefix("bearer "))
        })
        .map(str::to_string)
}

pub async fn authenticate(
    headers: HeaderMap,
    query: Query<TokenQuery>,
    secret: &str,
    db: &PgPool,
) -> Result<String, AppError> {
    let header_token = headers
        .get(axum::http::header::AUTHORIZATION)
        .and_then(|value| value.to_str().ok())
        .and_then(|value| {
            value
                .strip_prefix("Bearer ")
                .or_else(|| value.strip_prefix("bearer "))
        });
    let token = header_token.or(query.token.as_deref()).ok_or_else(|| {
        AppError::Auth("missing bearer token or token query parameter".to_string())
    })?;
    let claims = if header_token.is_some() {
        jwt::verify_token(token, secret)?
    } else {
        jwt::verify_realtime_ticket(token, secret)?
    };
    let user_id = jwt::user_id_from_claims(&claims)
        .ok_or_else(|| AppError::Auth("token does not contain a user id".to_string()))?;
    if user_id.is_empty() || user_id.len() > 100 {
        return Err(AppError::Auth(
            "token contains an invalid user id".to_string(),
        ));
    }
    if header_token.is_none() {
        let jti = claims
            .jti
            .as_deref()
            .ok_or_else(|| AppError::Auth("ticket has no identifier".to_string()))?;
        if !crate::db::consume_realtime_ticket(db, jti, &user_id).await? {
            return Err(AppError::Auth(
                "realtime ticket was already used or expired".to_string(),
            ));
        }
    }
    if !crate::db::user_active(db, &user_id).await? {
        return Err(AppError::Auth("account is unavailable".to_string()));
    }
    Ok(user_id)
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::http::{HeaderValue, header};

    #[test]
    fn query_token_takes_precedence() {
        let mut headers = HeaderMap::new();
        headers.insert(
            header::AUTHORIZATION,
            HeaderValue::from_static("Bearer header-token"),
        );
        let query = TokenQuery {
            token: Some("query-token".into()),
        };
        assert_eq!(
            extract_token(&headers, &query).as_deref(),
            Some("query-token")
        );
    }

    #[test]
    fn extracts_case_insensitive_bearer_prefix() {
        let mut headers = HeaderMap::new();
        headers.insert(
            header::AUTHORIZATION,
            HeaderValue::from_static("bearer token"),
        );
        assert_eq!(
            extract_token(&headers, &TokenQuery { token: None }).as_deref(),
            Some("token")
        );
    }

    #[test]
    fn rejects_other_authorization_schemes() {
        let mut headers = HeaderMap::new();
        headers.insert(
            header::AUTHORIZATION,
            HeaderValue::from_static("Basic token"),
        );
        assert!(extract_token(&headers, &TokenQuery { token: None }).is_none());
    }
}
