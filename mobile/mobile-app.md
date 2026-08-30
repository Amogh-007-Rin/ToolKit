# ToolKit Mobile App Plan

## Summary

Build a store-ready React Native application for iOS and Android using Expo, Expo Router, TypeScript, and NativeWind. The app will provide complete behavioral parity with the web product while translating the desktop design into native mobile patterns.

The milestone target is a staging-connected release candidate. GitHub Actions, production infrastructure, and automated production deployment pipelines will be handled in the post-milestone section.

## Implementation Milestones

## Implementation Status

Last reviewed: 2026-08-30

- [ ] **Milestone 1 — In progress.** Expo/Router/NativeWind, strict TypeScript, environment templates, the initial OpenAPI contract, native-session migrations, and dual cookie/Bearer authorization are implemented. The remaining work is complete `/api/v1` coverage, generated contract clients, shared domain-service extraction, persistent server idempotency enforcement, and signed staging OTA/EAS profiles.
- [ ] **Milestone 2 — In progress.** Rotating hashed refresh-token families, SecureStore, credential verification/recovery, four-provider OAuth with PKCE, session revocation, biometric locking, Rust dual-token verification, scoped realtime tickets, and deletion scheduling/restoration are implemented. Remaining work includes one-use realtime-ticket consumption, scheduled final purge across both databases/object storage, and complete recovery/deletion email orchestration.
- [ ] **Milestone 3 — In progress.** Onboarding, five tabs, nested navigation, theme/accessibility preferences, safe external links, contextual permissions, core native components, and an English catalog foundation are implemented. Remaining work includes the complete reusable component set, tablet rail/split layouts, full string catalog migration, focus/accessibility audits, haptics, and polished permission-recovery flows.
- [ ] **Milestone 4 — In progress.** Feed/post interactions and media creation, collection/tool CRUD, profile editing, creator search, persisted AI chat, realtime room/history/send flows, notifications, account settings, export, reporting, and blocking have working native foundations. Remaining work includes complete public-profile/social navigation, collection import UI, saved-content views, multi-media editing/viewers, messaging media/presence polish, notification filters/deletion UI, QR links, and final legal/support screens.
- [ ] **Milestone 5 — In progress.** TanStack Query, Zustand, SecureStore, SQLite mutation queues, mutation IDs, upload progress/cancellation, push device APIs, transactional outbox creation, and the Rust Expo push worker are implemented. Remaining work includes persisted query caches, queue integration for every retry-safe mutation, visible retry/discard UI, attachment upload UI, one-use ticket storage, REST reconciliation coverage, and database-backed worker integration tests.
- [ ] **Milestone 6 — In progress.** Roles, blocks, reports, immutable evidence/audit models, moderator APIs, confirmation gates, SMTP, redaction-conscious push behavior, and server-side rate limits are implemented. Remaining work includes the moderation web console, appeals/suspension enforcement, configurable profanity/spam policy, GlitchTip/PostHog adapters and controls, complete legal/store metadata, icons/screenshots, and release accessibility/security audits.

No numbered milestone is marked complete until every bullet in that milestone and its applicable acceptance tests is implemented and verified.

<!-- NEXT_MILESTONE_TO_IMPLEMENT: Finish Milestone 1 by extracting shared domain services, exposing every required resource through /api/v1, generating the mobile client from the complete OpenAPI document, and enforcing persistent idempotency/correlation behavior end to end. -->

### 1. Shared platform and backend foundation

- Scaffold the Expo app with Expo Router, NativeWind, strict TypeScript, environment profiles, development builds, and signed staging OTA channels.
- Preserve ToolKit’s font, red accent, light/dark palettes, card styling, icon language, loaders, reduced-motion mode, and high-contrast mode. Convert the existing font asset to a native-compatible format if necessary.
- Introduce shared, versioned API contracts and an OpenAPI specification for mobile endpoints. Generate the mobile API client and share validation rules with the web application where practical.
- Refactor backend business logic out of individual route handlers so existing web routes and new `/api/v1` routes use the same authorization, validation, storage, and database operations.
- Keep all existing web URLs and cookie-based sessions backward compatible.
- Add cursor pagination, consistent camelCase responses, structured error codes, idempotency keys, and request correlation IDs to mobile-facing APIs.
- Configure separate development, staging, and production environment profiles without committing secrets.

### 2. Native authentication and account lifecycle

- Add short-lived signed access tokens and rotating refresh-token families. Store only refresh-token hashes, device metadata, expiry, rotation state, and revocation state in PostgreSQL.
- Store native tokens in SecureStore; never place refresh tokens in AsyncStorage, SQLite, URLs, logs, or analytics.
- Support credentials plus Google, GitHub, LinkedIn, and Discord OAuth.
- Implement OAuth as authorization-code plus PKCE through the existing backend, using Expo AuthSession and an app deep-link callback. Reuse existing provider/account linking behavior and reject unsafe redirect URIs.
- Add registration, email verification, resend verification, forgot/reset password, token revocation, logout-current-device, and logout-all-devices endpoints.
- Preserve existing users by treating existing credential accounts as verified during migration; require verification for new credential registrations.
- Add optional Face ID/Touch ID/device-biometric locking with passcode fallback. Biometric permission is requested only when enabled.
- Update the centralized server authorization helper to accept either an existing NextAuth web session or a native Bearer token.
- Update the Rust service to retain existing NextAuth JWE support while accepting audience-scoped native tokens.
- Issue one-use, short-lived realtime tickets for WebSocket connection URLs so normal access tokens are not exposed in WebSocket query strings.
- Add a 30-day account-deletion workflow: immediately revoke sessions and hide the account, allow restoration during the recovery window, then purge or anonymize social data, messaging data, device tokens, AI history, and owned media.

### 3. Native shell, navigation, and design system

- Provide a short, skippable branded onboarding sequence followed by unified sign-in and registration.
- Use five bottom tabs: Overview, Tools, AI Search, Messages, and Explore.
- Place notifications and the current-user avatar in screen headers. Profile, settings, saved content, legal pages, support, and data export live in nested stacks.
- Use adaptive tablet layouts: navigation rail where appropriate, split room/conversation messaging, and multi-column collection/feed layouts. Support portrait and landscape.
- Build reusable native components for cards, buttons, inputs, sheets, dialogs, menus, avatars, badges, skeletons, errors, empty states, media viewers, and confirmation flows.
- Use native gestures, haptics, safe areas, keyboard avoidance, pull-to-refresh, and platform-appropriate back behavior.
- Request notification, camera, library, file, and biometric permissions contextually with pre-permission explanations and recovery links to system settings.
- External tool links open through a safe in-app browser or the system browser after validating HTTP/HTTPS schemes.
- Structure all strings through an English locale catalog so additional languages can be added without rewriting screens.
- Meet mobile accessibility expectations for screen readers, dynamic type, contrast, reduced motion, focus order, labels, and minimum touch targets.

### 4. Complete feature parity

- **Overview:** creator/tool/post search, discover feed, post cards, media galleries, detail views, likes, comments, saves, editing, deletion, and optimistic feedback.
- **Tools and collections:** collection CRUD, tool CRUD, links and logos, search/filtering, showcase selection, public showcase viewing, and importing another user’s collection.
- **Profiles and social graph:** profile/banner editing, skills, role, location, unique tags, public profiles, follower/following counts, follow/unfollow, collection showcases, posts, share sheets, and QR/deep links.
- **Explore:** debounced creator search, filters, empty/error states, and profile navigation.
- **AI Search:** persisted conversations, new/delete/select chat, conversational context, tool result cards, favicon/avatar fallback, collection saving, rate-limit feedback, retry handling, and server-only Gemini credentials.
- **Messaging:** direct-room creation, room list, history pagination, unread counts, optimistic sends, delivery acknowledgements, typing state, presence, last seen, reconnect handling, read state, emoji, image/video attachments, and deep links from notifications.
- **Notifications:** in-app activity feed, unread badges, mark-one/all-read, deletion, filters, follow/like/comment/message preferences, and deep linking to the target content.
- **Settings:** profile/account details, password change, notification preferences, push-preview privacy, privacy/discoverability controls, theme, high contrast, reduced motion, biometric lock, session management, data export through the native share sheet, sign-out, and account deletion.
- **Support and legal:** native and web privacy policy, terms, support/contact, deletion instructions, and consent-version records. Draft project-specific copy, but require owner/legal approval before release.
- Replace web-only visual effects that are unsuitable for native rendering with lighter Reanimated or Skia treatments that preserve the same brand character.

### 5. Offline, media, realtime, and push infrastructure

- Use TanStack Query for server state, a small Zustand store for session/UI state, SecureStore for secrets, and SQLite for persisted cache and mutation queues.
- Show cached feeds, collections, profiles, notifications, AI history, rooms, and messages when offline.
- Queue idempotent or safely retryable mutations such as messages, post creation, media uploads, likes, saves, follows, read state, and preference changes.
- Require connectivity for password/auth changes, account deletion/restoration, destructive content deletion, and moderation actions.
- Assign client mutation IDs and persist server idempotency records. Duplicate retries must return the original result rather than create duplicate posts, messages, comments, or social actions.
- Resolve optimistic conflicts using server state as authoritative, visibly mark failed queued work, and provide retry/discard controls.
- Support camera capture, photo/video library selection, and document-picker selection of allowed images/videos. Preserve existing server limits and show compression/upload progress, cancellation, retry, and previews.
- Refresh private media URLs before expiry and prevent protected object URLs from entering logs or analytics.
- Add device registration and push-preference APIs for Expo push tokens, platform, app version, locale, and last-active time.
- Add a transactional notification outbox used by both Next.js social actions and Rust message persistence.
- Run a separately deployable worker from the Rust workspace to deliver Expo pushes, retry transient failures, inspect receipts, invalidate bad tokens, and avoid duplicate delivery.
- Default lock-screen notifications to sender/event summaries. Let users disable detailed previews and independently control social and message pushes.
- Keep WebSocket reconnect backoff, heartbeats, bounded queues, and REST reconciliation after reconnect or push-open.

### 6. Safety, moderation, and release hardening

- Add user blocking across feeds, search, profiles, comments, room creation, realtime delivery, presence, notifications, and push delivery.
- Add reporting for profiles, posts, comments, and messages with a reason, optional description, immutable evidence snapshot, status, and audit history.
- Add configurable profanity/spam checks and server-side abuse rate limits without silently sending private content to external moderation vendors.
- Build a role-protected web moderation console for report triage, content review, warnings, content removal, user suspension, appeals, and immutable moderator audit logs.
- Formalize roles instead of relying on unrestricted string values, enforce authorization server-side, and require elevated confirmation for destructive moderation actions.
- Position the product as 13+ and include appropriate UGC, privacy, reporting, and support disclosures in store metadata.
- Self-host GlitchTip for crashes/performance and PostHog for privacy-conscious product analytics. Use generic authenticated SMTP for verification, recovery, deletion, and moderation emails.
- Redact tokens, passwords, message content, media URLs, and sensitive profile fields from logs, crash reports, traces, and analytics.
- Add user-facing analytics controls where legally required and keep essential operational telemetry separate from optional product analytics.
- Complete app icons, splash screens, adaptive Android assets, notification icons, permission descriptions, screenshots, store descriptions, age-rating questionnaires, privacy declarations, and data-safety forms.
- Use placeholder native identifiers until ownership is decided; final Apple bundle ID, Android application ID, support email, legal entity, domains, and store accounts are explicit release gates.

## Public Interfaces and Data Changes

- Add versioned `/api/v1` resources for authentication, sessions, profiles, feeds, posts, comments, collections, tools, AI chats, media, notifications, devices, blocks, reports, deletion/restoration, and realtime tickets.
- Preserve existing web endpoints while both surfaces delegate to shared domain services.
- Add database models for native sessions/refresh families, verification and password-reset tokens, device push registrations, notification outbox/receipts, idempotency records, blocks, reports, moderation actions, consent versions, and scheduled deletion.
- Extend notification preferences with message pushes, social pushes, preview visibility, and platform-level enablement.
- Add a stable client-generated ID to messages and other queued creations for exactly-once retry behavior.
- Version the mobile deep-link contract for OAuth callbacks, profiles, posts, conversations, notifications, password reset, email verification, and account restoration.
- Return stable error codes such as `AUTH_EXPIRED`, `VALIDATION_FAILED`, `CONFLICT`, `RATE_LIMITED`, `BLOCKED`, and `OFFLINE_RETRYABLE`; UI copy remains localized in the client.

## Test and Acceptance Plan

- Unit-test mobile components, reducers/stores, validation, deep-link parsing, offline queueing, retry policies, token refresh locking, theme behavior, and analytics redaction.
- Add backend integration tests for Bearer and cookie authorization, refresh rotation/replay rejection, OAuth linking, email tokens, idempotency, blocking, reporting, outbox delivery, deletion/restoration, and media ownership.
- Add Rust tests for dual-token authentication, realtime tickets, message idempotency, blocked-user enforcement, push outbox creation, and worker retry/receipt handling.
- Add database-backed API and WebSocket integration tests using isolated PostgreSQL and Redis instances.
- Add Maestro end-to-end flows for onboarding, every authentication method, core tabs, posts, tools, profiles, AI search, messaging, offline recovery, push-open navigation, settings, reports, blocks, export, and deletion recovery.
- Test current and previous supported iOS versions, representative Android API levels, small phones, notched phones, tablets, portrait/landscape, dynamic type, screen readers, dark mode, high contrast, reduced motion, poor networks, background/foreground transitions, expired tokens, denied permissions, and process termination.
- Continue requiring all existing Bun and Rust tests, ESLint, TypeScript, Clippy, and production builds to pass.
- Milestone acceptance requires full parity on staging, no high-severity security/accessibility issues, successful manual TestFlight and Play internal-track builds, legal-owner approval, and documented rollback/recovery procedures.

## Post-Milestone Work

- Add GitHub Actions for contract verification, web/mobile/Rust tests, linting, type checks, security scanning, migration checks, and release artifact validation.
- Build automated staging and production deployment pipelines for the web API, message service, push worker, PostgreSQL migrations, Redis, object storage, GlitchTip, and PostHog.
- Connect approved EAS Build/Submit workflows to protected release branches and store credentials.
- Provision production HTTPS/WSS domains, managed secrets, backups, alerting, retention policies, scaling, and disaster recovery.
- Finalize app identifiers and signing ownership, then submit production builds to App Store Connect and Google Play.
- Roll out production through internal testing, limited cohorts, staged OTA/binary releases, monitored expansion, and documented rollback gates.

## Assumptions and Defaults

- The app is a native adaptation of the existing brand, not a pixel-for-pixel desktop port.
- Existing web behavior and users remain backward compatible throughout the work.
- English ships first, with all UI strings localization-ready.
- Staging is the immediate environment; production automation is intentionally deferred until after feature milestones.
- Manual EAS development/internal builds are acceptable during milestones; Expo Go is insufficient because notifications and several native integrations require development builds.
- Staged, signed Expo OTA updates are enabled for compatible JavaScript/assets changes; native dependency changes require new store binaries.
- “Files” means selecting supported image/video files, not adding arbitrary document messaging.
- Realtime messages remain server-readable as they are today; end-to-end encryption is outside this parity project.
- New product behavior added beyond web parity is limited to native authentication, push, offline support, account lifecycle, UGC safety, legal readiness, and production observability required for a credible store release.
