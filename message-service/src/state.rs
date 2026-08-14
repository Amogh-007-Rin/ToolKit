use crate::config::Config;
use crate::pubsub::RedisBus;
use crate::ws::messages::ServerEvent;
use chrono::{DateTime, Utc};
use dashmap::{DashMap, DashSet};
use sqlx::PgPool;
use std::sync::Arc;
use tokio::sync::{broadcast, mpsc};
use uuid::Uuid;

pub type ConnId = Uuid;
pub type UserId = String;
pub type RoomId = String;

#[derive(Debug)]
pub enum Outgoing {
    Event(ServerEvent),
    Ping,
    Close,
}

#[derive(Debug)]
pub struct Session {
    pub user_id: UserId,
    pub tx: mpsc::Sender<Outgoing>,
    pub rooms: DashSet<RoomId>,
}

#[derive(Clone)]
pub struct AppState {
    pub config: Arc<Config>,
    pub db: PgPool,
    pub redis: Arc<RedisBus>,
    pub sessions: Arc<DashMap<ConnId, Session>>,
    pub room_connections: Arc<DashMap<RoomId, DashSet<ConnId>>>,
    pub last_seen: Arc<DashMap<UserId, DateTime<Utc>>>,
    shutdown_tx: broadcast::Sender<()>,
}

impl AppState {
    pub fn new(config: Config, db: PgPool, redis: Arc<RedisBus>) -> Self {
        let (shutdown_tx, _) = broadcast::channel(16);
        Self {
            config: Arc::new(config),
            db,
            redis,
            sessions: Arc::new(DashMap::new()),
            room_connections: Arc::new(DashMap::new()),
            last_seen: Arc::new(DashMap::new()),
            shutdown_tx,
        }
    }

    pub fn shutdown_rx(&self) -> broadcast::Receiver<()> {
        self.shutdown_tx.subscribe()
    }

    pub fn shutdown(&self) {
        let _ = self.shutdown_tx.send(());
    }

    pub fn register_session(&self, conn_id: ConnId, user_id: UserId, tx: mpsc::Sender<Outgoing>) {
        let session = Session {
            user_id,
            tx,
            rooms: DashSet::new(),
        };
        self.sessions.insert(conn_id, session);
    }

    pub fn remove_session(&self, conn_id: ConnId) {
        if let Some((_, session)) = self.sessions.remove(&conn_id) {
            for room in session.rooms.iter() {
                if let Some(connections) = self.room_connections.get(room.key()) {
                    connections.remove(&conn_id);
                    let empty = connections.is_empty();
                    drop(connections);
                    if empty {
                        self.room_connections.remove(room.key());
                    }
                }
            }
            let has_other_connections = self
                .sessions
                .iter()
                .any(|entry| entry.value().user_id == session.user_id);
            if !has_other_connections {
                self.last_seen.insert(session.user_id.clone(), Utc::now());
            }
        }
    }

    pub fn touch_user(&self, user_id: &str) {
        self.last_seen.remove(user_id);
    }

    pub fn get_user_last_seen(&self, user_id: &str) -> Option<DateTime<Utc>> {
        self.last_seen.get(user_id).map(|entry| *entry.value())
    }

    pub fn join_room(&self, conn_id: ConnId, room_id: &str) {
        if let Some(session) = self.sessions.get(&conn_id) {
            session.rooms.insert(room_id.to_string());
        }
        self.room_connections
            .entry(room_id.to_string())
            .or_default()
            .insert(conn_id);
    }

    pub fn leave_room(&self, conn_id: ConnId, room_id: &str) {
        if let Some(session) = self.sessions.get(&conn_id) {
            session.rooms.remove(room_id);
        }
        if let Some(connections) = self.room_connections.get(room_id) {
            connections.remove(&conn_id);
            let empty = connections.is_empty();
            drop(connections);
            if empty {
                self.room_connections.remove(room_id);
            }
        }
    }

    pub fn send_to_conn(&self, conn_id: ConnId, event: ServerEvent) {
        if let Some(session) = self.sessions.get(&conn_id)
            && session.tx.try_send(Outgoing::Event(event)).is_err()
        {
            tracing::warn!(%conn_id, "dropping websocket event for a saturated connection");
        }
    }

    pub fn deliver_to_room(&self, room_id: &str, event: ServerEvent) {
        let exclude_user = event.exclude_user();
        if let Some(connections) = self.room_connections.get(room_id) {
            for conn_id in connections.iter() {
                if let Some(excluded) = exclude_user {
                    let is_own = self
                        .sessions
                        .get(&conn_id)
                        .map(|session| session.user_id == excluded)
                        .unwrap_or(false);
                    if is_own {
                        continue;
                    }
                }
                self.send_to_conn(*conn_id, event.clone());
            }
        }
    }
}
