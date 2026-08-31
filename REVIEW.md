# ToolKit review environment

This runbook starts the web API, PostgreSQL, Redis, private object storage, the
realtime messaging service, and the Expo mobile app. OAuth, outbound email,
Gemini, push delivery, EAS updates, and store signing remain optional during a
local review and require owner-supplied credentials.

## Prerequisites

- Bun 1.x, Docker with Compose, and Rust 1.93+
- Node-compatible iOS or Android development tooling for a simulator, or a
  physical device on the same network as the development machine

## 1. Configure local services

Copy `web/.env.example` to `web/.env` and replace `NEXTAUTH_SECRET` with a
random value. Export that same value before starting Compose:

```bash
export NEXTAUTH_SECRET='the-same-random-value-from-web-env'
docker compose up -d --build
cd web
bun install
bunx prisma migrate deploy
```

Wait until `docker compose ps` reports PostgreSQL, Redis, and MinIO healthy.
The messaging service listens on `http://localhost:8080`; the web app proxies
browser messaging requests to it.

## 2. Start the web app

```bash
cd web
bun dev
```

Open `http://localhost:3000`. Credential registration works without OAuth.
When SMTP is not configured, verification/recovery mail cannot be delivered;
use a test SMTP account for reviewing those flows.

## 3. Start the mobile app

Copy `mobile/.env.example` to `mobile/.env`. For an iOS simulator, its API URLs
may use `http://127.0.0.1:3000/api/v1` and `http://127.0.0.1:8080`. For Android
emulator use `10.0.2.2`; for a physical device use the development machine's
LAN address. For example:

```dotenv
APP_VARIANT=development
EXPO_PUBLIC_API_URL=http://192.168.1.20:3000/api/v1
EXPO_PUBLIC_MESSAGE_SERVICE_URL=http://192.168.1.20:8080
```

Then run:

```bash
cd mobile
bun install
bun start
```

Use a development build for push notifications and native integrations. The
placeholder EAS project ID disables OTA updates locally, so local review does
not contact a nonexistent update project.

## 4. Review checks

```bash
cd mobile && bun run typecheck && bun test
cd ../web && bun test && bun run lint && bun run build
cd ../message-service && cargo fmt --check && cargo clippy --all-targets -- -D warnings && cargo test
```

Before staging review, replace placeholder app identifiers, EAS project ID,
support address, domains, SMTP settings, analytics endpoints, and signing
ownership. Do not commit `.env` files, private keys, or provider credentials.
