# Auto-Sync Documentation

## Overview

The Wealth Atlas app now supports automatic synchronization of data whenever changes occur in the database. This feature ensures your data is always backed up to the cloud without manual intervention.

## How It Works

### 1. Database Change Detection

- Uses Dexie's hook system to monitor all database tables
- Listens for `creating`, `updating`, and `deleting` operations
- Automatically starts when the database initializes

### 2. Debounced Sync

- Changes are batched with a 2-second delay to avoid excessive API calls
- Multiple rapid changes trigger only one sync operation
- Non-intrusive error handling (failures don't interrupt the user)

### 3. User Control

- Users can enable/disable auto-sync from Settings
- Manual force sync option available
- Real-time status indicators show sync state

## Architecture

```
Database Changes → AutoSyncService → SyncService → Cloud API
                ↓
            Debouncing (2s delay)
                ↓
          Encrypted Sync Payload
```

## Components

### AutoSyncService

- **Location**: `src/data/sync/AutoSyncService.ts`
- **Purpose**: Manages database change listeners and triggers sync
- **Key Methods**:
  - `startListening()`: Begin monitoring database changes
  - `stopListening()`: Stop monitoring (called when auto-sync disabled)
  - `forceSyncNow()`: Immediate sync bypassing debounce
  - `getStatus()`: Current status of auto-sync system

### Enhanced SyncService

- **Location**: `src/data/sync/Syncer.ts`
- **Enhancement**: Added `setAutoSyncEnabled()` with proper lifecycle management
- **Behavior**: Automatically starts/stops listening when auto-sync is toggled

### Database Integration

- **Location**: `src/data/database.ts`
- **Enhancement**: Auto-initializes sync listener when database is ready
- **Behavior**: Seamless integration with existing database operations

### Settings UI

- **Location**: `src/app/components/pages/SettingsPage.tsx`
- **Features**:
  - Toggle switch for auto-sync
  - Real-time status indicators
  - Force sync button
  - Visual feedback for pending operations

## Usage

### For Users

1. **Setup Sync**: Go to Settings → Setup or Link sync with passphrase
2. **Enable Auto-Sync**: Toggle "Enable automatic sync on data changes"
3. **Monitor Status**: Check sync status indicators in Settings
4. **Force Sync**: Use "Force Sync Now" button if needed

### For Developers

#### Triggering Auto-Sync

Auto-sync is triggered automatically by any database operation:

```typescript
// These operations automatically trigger sync (if enabled)
await db.assets.add(newAsset);
await db.expenses.put(updatedExpense);
await db.investments.delete(investmentId);
```

#### Manual Control

```typescript
import { AutoSyncService } from '@/data/sync/AutoSyncService';

// Check status
const status = AutoSyncService.getStatus();
console.log('Is listening:', status.isListening);
console.log('Has pending sync:', status.hasPendingSync);
console.log('Sync configured:', status.syncConfigured);

// Force immediate sync
try {
  const result = await AutoSyncService.forceSyncNow();
  console.log('Synced version:', result?.version);
} catch (error) {
  console.error('Sync failed:', error);
}
```

#### Enable/Disable Auto-Sync

```typescript
import { SyncService } from '@/data/sync/Syncer';

// Enable auto-sync
SyncService.setAutoSyncEnabled(true);

// Disable auto-sync
SyncService.setAutoSyncEnabled(false);
```

## Security

- **Encryption**: All synced data is encrypted using AES-GCM before transmission
- **Passphrase**: Required for encryption/decryption, stored locally only when auto-sync enabled
- **Key Management**: Unique key ID per sync setup, passphrase never transmitted

## Performance Considerations

- **Debouncing**: 2-second delay prevents excessive API calls during bulk operations
- **Background Sync**: Non-blocking, doesn't interrupt user interactions
- **Error Handling**: Failed syncs are logged but don't throw errors to user code
- **Memory**: Minimal overhead, only stores necessary state

## Error Scenarios

1. **Network Issues**: Sync fails silently, retried on next change
2. **Authentication**: Invalid passphrase logs warning, requires user intervention
3. **Server Errors**: Logged for debugging, auto-sync continues on next change
4. **Sync Disabled**: Changes ignored, no sync attempted

## Development Notes

- Uses domain/service layer pattern (follows project architecture)
- Leverages existing Logger utility for consistent logging
- Integrates with Material-UI design system
- Follows TypeScript best practices with proper typing
- Respects the container-presentational component pattern

## Future Enhancements

1. **Conflict Resolution**: Handle simultaneous edits from multiple devices
2. **Selective Sync**: Choose which data types to auto-sync
3. **Sync History**: Track sync operations and show detailed logs
4. **Offline Queue**: Queue changes when offline, sync when reconnected
5. **Bandwidth Control**: Adjust sync frequency based on connection quality
