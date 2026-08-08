use crate::auth::{self, TokenQuery};
use crate::error::AppError;
use crate::state::{AppState, ConnId};
use crate::ws::session;
use axum::extract::ws::WebSocketUpgrade;
use axum::extract::{Query, State};
use axum::http::HeaderMap;
use axum::response::Response;
use uuid::Uuid;

pub async fn ws_handler(
    State(state): State<AppState>,
    Query(query): Query<TokenQuery>,
    headers: HeaderMap,
    ws: WebSocketUpgrade,
) -> Result<Response, AppError> {
    let user_id = auth::authenticate(headers, Query(query), &state.config.jwt_secret).await?;
    let conn_id: ConnId = Uuid::new_v4();
    Ok(ws.on_upgrade(move |socket| async move {
        session::run(state, socket, conn_id, user_id).await;
    }))
}
