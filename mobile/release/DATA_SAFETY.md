# Data safety and app privacy declaration worksheet

This is a technical inventory for the account owner and legal reviewer, not a submitted legal declaration.

## Data sent off device

| Store category | Examples | Purpose | Linked to account | Optional |
| --- | --- | --- | --- | --- |
| Contact info | email address | account, verification, recovery, deletion notices | yes | no |
| Personal info | name, tag, bio, role, location text, skills, avatar/banner | profile and social features | yes | profile fields partly optional |
| User content | posts, comments, collections, AI prompts/history, messages, reports | app functionality, safety | yes | feature-dependent |
| Photos/videos | selected post, profile, and message media | app functionality | yes | yes |
| Identifiers | account ID, native session/device registration IDs | authentication, security, push | yes | no |
| App interactions | optional product events | product analytics | pseudonymous analytics ID | yes, off by default |
| Diagnostics | redacted operational errors | reliability and security | avoid account linkage | essential |

ToolKit does not request device location. A profile `location` is user-entered text. There is no advertising SDK, cross-app tracking, contact-book access, or sale of user data in the current source.

## Security and control answers

- Data is expected to be encrypted in transit on staging/production HTTPS and WSS endpoints. Local development HTTP must never be used for a store build.
- Refresh tokens are stored in SecureStore. Query caches/preferences use local app storage; the SQLite mutation queue can contain pending user content but not refresh tokens.
- Optional analytics is off by default and has an in-app control with a consent record.
- Detailed push previews are off by default.
- Users can export data and schedule account deletion in-app.
- The 30-day recovery window and final purge cover the primary database, messaging schema, device registrations, AI history, and owned object storage.

## Submission verification

The owner must reconcile this worksheet against every enabled server integration and dependency in the exact release binary. Google Play requires disclosure of data collected by bundled SDKs, and one global declaration covers every distributed version/region. Apple collected-data declarations must be completed after legal determines the applicable purposes and retention. Do not claim “no data collected.”
