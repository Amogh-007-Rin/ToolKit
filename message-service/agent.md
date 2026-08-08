# Role & Goal
You are an expert Rust Systems Engineer and Distributed Architect. Build a highly performant, production-ready, real-time messaging microservice in Rust.

---

## 1. Tech Stack
* **Language**: Rust (latest stable edition)
* **Async Runtime**: `tokio` (full features)
* **Web/WebSocket Framework**: `axum` with `tokio-tungstenite` / `axum::extract::ws`
* **Message Broker / PubSub Backplane**: `redis` (via `redis-rs` or `fred`) for horizontal scaling across nodes
* **Database / Persistence**: `sqlx` with PostgreSQL (async)
* **Serialization**: `serde` and `serde_json`
* **Authentication**: `jsonwebtoken` (JWT verification middleware)
* **Observability & Logging**: `tracing` and `tracing-subscriber`
* **Error Handling**: `thiserror` for library/domain errors, `anyhow` for top-level application errors

---

## 2. Core Requirements & System Architecture

### A. WebSocket Handling & Connection Lifecycle
1. **Upgrade Endpoint**: Implement a `/ws` route that accepts incoming HTTP requests and upgrades them to WebSocket connections.
2. **Authentication**: Extract and validate a JWT passed either in the `Authorization: Bearer <token>` header or as a `token` query parameter during the handshake. Reject unauthenticated upgrades with standard HTTP status codes.
3. **Heartbeat / Ping-Pong**: Implement a background ping/pong ticker mechanism for each active connection. Automatically drop stale or unresponsive connections after 30 seconds of inactivity.
4. **Connection State**: Maintain in-memory state for local client connections (`BroadcastChannel` or `mpsc::UnboundedSender` mapped by `UserId` / `RoomId`).

### B. Messaging & Channel Architecture
1. **Pub/Sub Backplane**: Integrate Redis Pub/Sub so multiple microservice instances can broadcast messages horizontally across nodes.
2. **Message Envelope**: Define a type-safe JSON schema for WebSocket events:
   - `Connect`: Connection initialization / handshake acknowledgement.
   - `JoinRoom`: Client requests to join a channel/room.
   - `LeaveRoom`: Client requests to leave a channel/room.
   - `SendMessage`: Direct user message or room message.
   - `MessageAck`: Server acknowledgment of message delivery/persistence.
   - `Error`: Typed error payloads sent back to the client.

### C. Data Persistence & Delivery Strategy
1. **Message Lifecycle**:
   - Receive payload from WebSocket client.
   - Parse and validate message payload.
   - Asynchronously persist the message to PostgreSQL via `sqlx`.
   - Publish the event to the Redis Pub/Sub channel associated with `RoomId`.
   - Distribute the message locally to all WebSocket clients connected to this instance who are subscribed to `RoomId`.
2. **Graceful Degradation**: If the database write fails, log the error clearly and return a `MessageAck` failure status to the sender without broadcasting the message.

### D. Operational Concerns
1. **Graceful Shutdown**: Intercept `SIGINT` and `SIGTERM` signals using `tokio::signal`. Flushes active channels, closes active WebSocket streams with `CloseCode::Normal`, and safely disconnects from Redis and Postgres pools.
2. **Configuration**: Load configuration parameters (port, database URL, Redis URL, JWT secret, log levels) from environment variables using `dotenvy` and structured config parsing.

---

## 3. Mandatory Project Structure

Please generate the code following this directory layout:

```text
.
├── Cargo.toml
├── .env.example
├── src/
│   ├── main.rs
│   ├── config.rs
│   ├── error.rs
│   ├── state.rs
│   ├── auth/
│   │   ├── mod.rs
│   │   └── jwt.rs
│   ├── db/
│   │   ├── mod.rs
│   │   └── models.rs
│   ├── pubsub/
│   │   ├── mod.rs
│   │   └── redis.rs
│   └── ws/
│       ├── mod.rs
│       ├── handler.rs
│       ├── session.rs
│       └── messages.rs


4. Engineering & Safety Guidelines
Zero Panic Policy: Do not use unwrap(), expect(), or panic!() in core request paths. Handle every Result explicitly using idiomatic ? error propagation and thiserror.

Resource Safety: Avoid memory leaks by ensuring WebSocket streams, channels, and task handles (tokio::spawn) are dropped cleanly upon client disconnect.

Concurrency: Ensure thread-safe access to application state using Arc<AppState> with lock-free structures or minimal async mutex lock scopes (tokio::sync::RwLock or dashmap).

5. Deliverables Required
Complete Cargo.toml with all necessary dependencies and features enabled.

Production implementation for all modules listed in the project structure.

An example PostgreSQL SQL migration schema (schema.sql) for messages and room subscriptions.

An .env.example file.
