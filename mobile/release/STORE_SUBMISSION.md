# ToolKit store submission source of truth

Status: technically drafted; owner and legal approval required before submission.

## Positioning

- Category: Social Networking (primary), Productivity (secondary).
- Audience: 13+. The app is not directed to children and does not use advertising SDKs.
- Short description: Discover creator-recommended software, organise collections, and share your toolkit.
- Full description: Discover the software creators use, organise your own collections, share posts, ask ToolKit AI for recommendations, and talk with other creators. ToolKit includes private controls for discoverability, notification previews, analytics, blocked accounts, data export, and account deletion.

## Review notes

- A reviewer account and staging API/message-service endpoints must be supplied in the private review notes.
- Camera, photo-library, and file access occur only after an explicit user action. Selected images and videos are uploaded for posts, profiles, or conversations.
- Push notifications are optional. Detailed previews are off by default.
- Account deletion is available at Settings → Account, privacy, sessions, and data. It immediately hides the account and schedules final deletion after the documented 30-day recovery window.
- User-generated content supports reporting and blocking. Role-protected moderation supports review, removal, suspension, reinstatement, and immutable audit records.
- AI recommendations can be inaccurate and must be verified before reliance.

## Screenshot plan

Capture from the final staging binary with seeded, non-personal demonstration data:

1. Overview feed with a multi-media post.
2. Tool collections and collection detail.
3. AI recommendation conversation with tool result cards.
4. Message room with image attachment and delivery state.
5. Creator profile with showcased collections.
6. Settings privacy, accessibility, and notification controls.

Required device families: current 6.7-inch and 6.5-inch iPhone sizes, supported iPad size, Android phone, and Android tablet. Do not include production personal data, debug overlays, placeholder domains, or unavailable features.

## Ownership gates

- Replace `com.example.toolkit*` with approved Apple and Android identifiers.
- Replace every `toolkit.example` URL with the owned HTTPS domain.
- Set the legal entity, support email, privacy contact, copyright owner, and age-rating answers.
- Supply App Store Connect, Play Console, EAS project, signing, APNs, and FCM ownership.
- Obtain legal approval for privacy, terms, deletion, UGC, AI, and 13+ copy.
