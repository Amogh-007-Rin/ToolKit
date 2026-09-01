# Mobile release rollback and recovery

## OTA rollback

1. Stop promotion to the affected channel.
2. Re-publish the last verified JavaScript/assets bundle to that channel with the same compatible runtime version.
3. Confirm cold launch, authentication refresh, offline queue replay, deep links, and message reconnect on both platforms.
4. Record the incident, affected update IDs, runtime version, start/end times, and validation evidence.

Never use OTA to change native dependencies, permissions, privacy manifests, entitlements, or runtime-version compatibility. Those require a replacement binary.

## Binary rollback

1. Halt the staged rollout in App Store Connect or Play Console.
2. Keep backend contracts backward compatible with the current and previous supported binary.
3. On Android, promote the last known-good artifact where console policy permits. On iOS, prepare an expedited replacement build because an already released version cannot simply be restored as a new binary.
4. Disable only the affected feature through a documented server-side gate when backward-compatible mitigation is safer than a forced client update.

## Data recovery

- Do not discard persisted client mutations globally. Failed work remains visible with retry/discard controls.
- Idempotency records must remain available throughout the retry window before cleanup.
- Database restoration must include the primary public schema and messaging schema at a mutually consistent point.
- Object-storage restoration must preserve object keys referenced by restored database rows.
- Reconcile notification outbox and receipts after recovery to prevent duplicate pushes.
- Test account deletion purge against backups and retention obligations before enabling its production scheduler.
