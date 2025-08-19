# Wealth Atlas – Sync Design (Simple, Maintenance-First)

This document describes the minimal encrypted sync for a personal, local-first app. It favors simplicity and easy maintenance over advanced features.

## Goals and Constraints

- Personal app; solo-developed → keep it tiny and easy to maintain
- End-to-end encryption; server stores only opaque blobs
- Last-writer-wins
- No compression
- Passphrase-based key derivation (not numeric PIN)
- Backend provides GET, POST, PUT, DELETE
- No server-side auth beyond secrecy of keyId
- No client history/version snapshots (keep code minimal)

## High-level Architecture

- Server: dumb encrypted-blob store indexed by `keyId`; it returns/increments a `version` and `updatedAt` timestamp.
- Client: does export/import of Dexie data, encrypts/decrypts with passphrase, and manages simple sync state.

## API Contract

- POST /data
  - Body: `{ payload, meta }`
  - Creates a new dataset; returns `{ keyId, version, updatedAt }` (version starts at 1)
- GET /data/:keyId
  - Returns `{ keyId, version, payload, meta, updatedAt }`
- PUT /data/:keyId
  - Body: `{ payload, meta }`
  - Updates dataset with last-writer-wins (server increments version); returns `{ keyId, version, updatedAt }`
- DELETE /data/:keyId (optional feature)
  - Deletes the dataset; returns 204

Notes:

- No server-side conflict detection; truly last-writer-wins.
- Client may optionally show a warning if remote version differs from last-known, but this is not required by the protocol.

## Crypto

Browser Web Crypto (standards-only):

- Derive key: PBKDF2 with SHA-256
  - salt: 16 bytes random (stored in `meta`)
  - iterations: ~200k–300k (tune for UX; start 250k)
- Encrypt: AES-256-GCM
  - iv: 12 bytes random (stored in `meta`)
- Metadata stored with payload (non-secret):
  {
  "enc": "AES-GCM",
  "kdf": "PBKDF2-SHA256",
  "iterations": 250000,
  "salt": "base64",
  "iv": "base64",
  "schemaVersion": 7
  }
- AAD is omitted for MVP.

## Snapshot Payload Structure

Ciphertext of a JSON object shaped as:
{
"schemaVersion": 7,
"data": {
"assets": [],
"assetTransactions": [],
"scheduledAssetTransactions": [],
"expenses": [],
"scheduledExpenses": [],
"loans": [],
"paymentSchedules": [],
"loanPayments": [],
"goals": [],
"assetGoalAllocations": []
}
}

## Client Storage (minimal)

Use localStorage for small sync settings:

- `sync.keyId`: string | undefined
- `sync.lastRemoteVersion`: number | undefined
- `sync.lastSyncAt`: ISO string | undefined

Do not store the passphrase. The derived key is kept in memory (per session) only.

## User Flows

- Setup (create)
  1. User enters passphrase
  2. Export DB → encrypt → POST /data
  3. Save `keyId`, set `lastRemoteVersion` from response

- Link (join)
  1. User enters `keyId` + passphrase
  2. GET /data/:keyId → decrypt → import → set `lastRemoteVersion`

- Push (last-writer-wins)
  1. Export DB → encrypt → PUT /data/:keyId
  2. Update `lastRemoteVersion`

- Pull
  1. GET /data/:keyId
  2. If `version > lastRemoteVersion`: decrypt → import → update `lastRemoteVersion`

- Change passphrase
  1. Pull/decrypt locally
  2. Re-encrypt with new passphrase
  3. PUT /data/:keyId

- Unlink
  - Remove `keyId` and in-memory key; local data remains

## Error Handling (lean)

- Wrong passphrase → decryption fails → show error
- Schema mismatch → prompt to update the app or migrate (block MVP if incompatible)
- Network failures → remain offline; retry later

## Service Contract (TypeScript)

Methods:

- `setupSync(passphrase: string): Promise<{ keyId: string; version: number }>`
- `linkSync(keyId: string, passphrase: string): Promise<void>`
- `push(passphrase: string): Promise<{ version: number }>`
- `pull(passphrase: string): Promise<{ version: number | null }>` // null if up-to-date
- `changePassphrase(oldPass: string, newPass: string): Promise<void>`
- `unlink(): Promise<void>`
- `getStatus(): Promise<{ enabled: boolean; keyId?: string; lastRemoteVersion?: number; lastSyncAt?: string }>`

## Maintenance Notes

- No schema bumps needed for sync itself; only app data schema changes in `Dexie` continue as-is.
- Using localStorage avoids adding a Dexie settings table and migration.
- Server remains dumb; future enhancements (compression, history, auth) can be added later if needed.

## Risks and Tradeoffs (accepted)

- Overwrite risk due to last-writer-wins across devices.
- Wrong passphrase push can make remote unreadable until corrected.
- No history/rollback: recovery relies on another device or manual export.

## UI (Settings)

- Setup sync (create new keyId)
- Link existing (keyId + passphrase)
- Push, Pull
- Change passphrase
- Unlink
- Display: keyId (copy), remote version, last sync time
