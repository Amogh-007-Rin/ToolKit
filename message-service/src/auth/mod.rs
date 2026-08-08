pub mod jwt;

use crate::error::AppError;
use axum::extract::Query;
use axum::http::HeaderMap;
use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct TokenQuery {
    pub token: Option<String>,
}

pub fn extract_token(headers: &HeaderMap, query: &TokenQuery) -> Option<String> {
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
) -> Result<String, AppError> {
    let token = extract_token(&headers, &query).ok_or_else(|| {
        AppError::Auth("missing bearer token or token query parameter".to_string())
    })?;
    let claims = jwt::verify_token(&token, secret)?;
    let user_id = jwt::user_id_from_claims(&claims)
        .ok_or_else(|| AppError::Auth("token does not contain a user id".to_string()))?;
    if user_id.is_empty() || user_id.len() > 100 {
        return Err(AppError::Auth(
            "token contains an invalid user id".to_string(),
        ));
    }
    Ok(user_id)
}
