use crate::config::Config;
use crate::pubsub::RedisBus;
use crate::ws::messages::ServerEvent;
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
    pub tx: mpsc::UnboundedSender<Outgoing>,
    pub rooms: DashSet<RoomId>,
}

#[derive(Clone)]
pub struct AppState {
    pub config: Arc<Config>,
    pub db: PgPool,
    pub redis: Arc<RedisBus>,
    pub sessions: Arc<DashMap<ConnId, Session>>,
    pub room_connections: Arc<DashMap<RoomId, DashSet<ConnId>>>,
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
            shutdown_tx,
        }
    }

    pub fn shutdown_rx(&self) -> broadcast::Receiver<()> {
        self.shutdown_tx.subscribe()
    }

    pub fn shutdown(&self) {
        let _ = self.shutdown_tx.send(());
    }

    pub fn register_session(
        &self,
        conn_id: ConnId,
        user_id: UserId,
        tx: mpsc::UnboundedSender<Outgoing>,
    ) {
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
                }
            }
        }
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
        }
    }

    pub fn send_to_conn(&self, conn_id: ConnId, event: ServerEvent) {
        if let Some(session) = self.sessions.get(&conn_id) {
            let _ = session.tx.send(Outgoing::Event(event));
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
