FROM rust:1.93-slim AS builder
WORKDIR /app

COPY Cargo.toml Cargo.lock ./
COPY schema.sql ./schema.sql
RUN mkdir -p src && echo 'fn main() {}' > src/main.rs && cargo build --release
COPY src ./src
RUN touch src/main.rs && cargo build --release

FROM debian:bookworm-slim AS runtime
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/target/release/message-service /usr/local/bin/message-service
EXPOSE 8080
CMD ["/usr/local/bin/message-service"]
