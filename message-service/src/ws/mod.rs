pub mod handler;
pub mod messages;
pub mod session;

use crate::state::AppState;
use axum::Router;
use axum::routing::get;

pub fn router() -> Router<AppState> {
    Router::new().route("/ws", get(handler::ws_handler))
}
