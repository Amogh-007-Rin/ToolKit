Agent-name: Codex (/root)

# Tag 1 Before Release Report

Date: 2026-08-14

## Scope

Reviewed and hardened the complete `main` codebase, with focused implementation work in the Rust messaging service, Next.js web application, object-storage boundary, and local Docker deployment. No commits were created.

## Bugs fixed

- Fixed typing presence events being published when `is_member` returned `false`. Only confirmed room members can now emit typing state.
- Fixed post-edit media arithmetic that subtracted removed media twice and could allow an invalid image-plus-video combination.
- Fixed post-edit counts trusting duplicate or unrelated removal IDs; counts now derive from actual retained records.
- Fixed Redis reconnect backoff remaining at 30 seconds after a successful subscription. A successful subscription resets it to one second.
- Fixed empty room-connection sets accumulating indefinitely after users leave or disconnect.
- Fixed follow/unfollow relation, counters, and notifications being updated as separate operations. They now execute atomically in a database transaction.
- Fixed React render impurity in message presence timestamps by moving clock updates to a managed interval.
- Fixed Orb loader render-time ref access, unsafe `any` types, stale cleanup refs, resource disposal typing, and effect dependencies.
- Fixed the Google favicon `next/image` remote pattern incorrectly requiring port 9000 instead of HTTPS port 443.
- Fixed unsupported URL schemes being accepted for tool logos; only HTTP and HTTPS are accepted.

## Security and privacy fixes

- Replaced unbounded WebSocket outbound queues with bounded 256-event queues. Saturated clients no longer cause unlimited memory growth; heartbeat saturation closes the unhealthy connection.
- Prevented database error details from being returned to WebSocket clients during membership checks. Detailed errors remain server-side in structured logs.
- JWT/JWE authentication now rejects tokens without an expiry claim in addition to rejecting expired or invalid tokens.
- Media object keys for new posts are user-scoped as `posts/{userId}/{uuid}`.
- Post creation and editing now prove object-key ownership before linking media.
- Post and profile deletion cleanup now deletes only keys owned by the authenticated user, preventing cross-user object deletion.
- Presigned PUT operations now include the validated content length, and the API rejects zero, negative, fractional, non-safe-integer, unsupported, and oversized upload declarations.
- Added bounded in-memory rate limiting to unauthenticated registration and per-user AI requests to reduce scrypt/AI quota abuse. Deployment-level distributed rate limiting remains recommended for multi-instance production.
- Secured Redis with password authentication and verified that anonymous commands return `NOAUTH`.
- Bound PostgreSQL, Redis, MinIO, the MinIO console, and the messaging-service development ports to `127.0.0.1` rather than every host interface.
- Preserved MinIO private-bucket behavior and verified authenticated service connectivity after the Redis change.

## Messaging-service performance and reliability optimizations

- Bounded per-client queues provide deterministic memory usage and explicit backpressure behavior.
- Empty room maps are reclaimed promptly, reducing long-running state growth.
- Successful Redis subscriptions reset reconnect latency to one second.
- Kept lock scopes short and retained DashMap/DashSet-based concurrent access.
- Production release compilation succeeds with optimized Rust output.
- Docker image rebuilt successfully with the updated release binary.

## Next.js performance and quality optimizations

- Replaced the remaining raw `<img>` elements in AI search with `next/image`, including explicit dimensions to prevent layout shift and enable image optimization.
- Corrected the favicon optimizer allow-list so remote favicon optimization works.
- Removed an unused icon import and all ESLint errors/warnings.
- Stabilized message presence updates to one timer tick every 30 seconds rather than reading an impure clock during arbitrary renders.
- Strengthened Three.js Orb loader types and deterministic cleanup, preventing stale DOM/ref cleanup and improving React concurrency compatibility.
- Added a dedicated `test` package script and excluded test-only Bun modules from the production Next.js TypeScript graph.
- The optimized Next.js production build completes successfully and generates all 30 routes.

## Tests added

### Rust

- JWT rejection when `exp` is absent.
- Bearer token extraction, lowercase bearer support, query-token precedence, and rejection of other authorization schemes.
- Identifier length boundaries.
- Attachment kind, key length, and filename length validation.
- Server-event camelCase serialization.
- Typing-event sender exclusion behavior.

Final Rust result: 15 passed, 0 failed.

### Web

- Media type and exact size-boundary validation.
- Object-key generation, traversal rejection, and user ownership isolation.
- Fixed-window limiter exhaustion, reset, and independent-key behavior.
- Forwarded client-address extraction.
- Scrypt password hash verification, wrong-password rejection, and malformed-hash rejection.
- Registration normalization and password constraints.
- Post tag-count and empty-comment validation.
- Profile tag and unsafe tool-logo URL rejection.

Final web result: 11 passed, 0 failed, 28 assertions.

## Final verification

- `cargo fmt --check`: passed.
- `cargo clippy --all-targets -- -D warnings`: passed.
- `cargo test --all-targets`: 15 passed.
- `cargo build --release`: passed.
- `bun test`: 11 passed.
- `bun run lint`: passed with zero warnings and zero errors.
- `bunx tsc --noEmit`: passed.
- `bun run build`: passed; all 30 Next.js routes generated.
- `docker compose config --quiet`: passed.
- `docker compose up -d --build`: passed; PostgreSQL, Redis, MinIO, and messaging service healthy/running.
- Messaging `/healthz`: returned `{ "status": "ok" }`.
- Redis anonymous `PING`: rejected with `NOAUTH Authentication required`.
- Redis authenticated `PING`: returned `PONG`.
- `git diff --check`: passed.

## Residual production recommendations

- Replace development Redis and MinIO passwords with secret-managed random credentials before deployment.
- Terminate TLS in front of the web, object-storage, and WebSocket endpoints; use `rediss://` between networks where appropriate.
- Use a shared rate-limit backend when running multiple Next.js instances.
- Add browser-level end-to-end tests and database-backed route/WebSocket integration tests in CI for coverage beyond the unit and live health checks added here.

## Follow-up: AI-search profile avatar

- Fixed OAuth-backed profile avatars disappearing in AI-search after migration to `next/image`.
- Added narrow HTTPS image-optimizer allow-list entries for Google, GitHub, LinkedIn, and Discord avatar CDNs while retaining the private MinIO pattern.
- Added a resilient user-avatar component that falls back to the user's initial if an avatar URL is stale or fails to load.
- Re-ran ESLint, TypeScript, 11 web tests, and the complete 30-route Next.js production build successfully.
- Enabled Next.js 16 private-IP image optimization conditionally only when `S3_ENDPOINT` resolves to localhost, loopback, link-local, or an RFC1918 IPv4 address. Public production S3 endpoints retain the secure default that blocks internal-network image fetching.
