# Storage Service Contract

**Service**: StorageService  
**Purpose**: Manage persistence of recording sessions and configuration using Chrome Storage API  
**Storage Backend**: chrome.storage.local

---

## Interface Definition

```javascript
class StorageService {
  // Session Management
  async createSession(): Promise<RecordingSession>
  async getActiveSession(): Promise<RecordingSession | null>
  async updateSession(session: RecordingSession): Promise<void>
  async stopSession(sessionId: string): Promise<RecordingSession>
  async getSession(sessionId: string): Promise<RecordingSession | null>
  async listSessions(limit: number = 10): Promise<RecordingSession[]>
  async deleteSession(sessionId: string): Promise<void>
  
  // Event Management
  async addEvent(event: InteractionEvent): Promise<void>
  async getEvents(sessionId: string): Promise<InteractionEvent[]>
  
  // Configuration Management
  async getConfig(): Promise<EventConfiguration>
  async updateConfig(config: EventConfiguration): Promise<void>
  async resetConfig(): Promise<EventConfiguration>
  
  // Storage Management
  async getStorageStats(): Promise<StorageStats>
  async cleanup(): Promise<CleanupResult>
  async clearAllData(): Promise<void>
}
```

---

## Method Specifications

### Session Management

#### `createSession()`

Creates a new recording session and sets it as active.

**Input**: None

**Output**: `Promise<RecordingSession>`
- New session with status='recording'
- Unique sessionId (UUID v4)
- startTime set to current time (ISO 8601)
- Empty events array
- endTime = null

**Side Effects**:
- Stores session as activeSession in chrome.storage.local
- Previous active session (if any) is moved to archive with status='stopped'

**Errors**:
- Throws `StorageError` if chrome.storage.local fails
- Throws `SessionExistsError` if active session already exists and is recording

**FR Mapping**: FR-001 (record button initiates session)

---

#### `getActiveSession()`

Retrieves the currently active recording session.

**Input**: None

**Output**: `Promise<RecordingSession | null>`
- Current active session if exists
- null if no active session

**Side Effects**: None (read-only)

**Errors**:
- Throws `StorageError` if chrome.storage.local fails

**FR Mapping**: Used by all recording controls to check session state

---

#### `updateSession(session: RecordingSession)`

Updates an existing session (status changes, adding metadata, etc.).

**Input**: 
- `session`: RecordingSession - Complete session object with updates

**Output**: `Promise<void>`

**Side Effects**:
- Updates session in chrome.storage.local
- If session is active, updates activeSession
- Otherwise updates in sessions archive

**Errors**:
- Throws `SessionNotFoundError` if session doesn't exist
- Throws `ValidationError` if session object is invalid
- Throws `StorageError` if chrome.storage.local fails

**FR Mapping**: FR-002 (pause), FR-003 (resume), FR-004 (stop)

---

#### `stopSession(sessionId: string)`

Stops a recording session and prepares it for export.

**Input**:
- `sessionId`: string - Session to stop

**Output**: `Promise<RecordingSession>`
- Updated session with status='stopped' and endTime set

**Side Effects**:
- Sets session status to 'stopped'
- Sets endTime to current time (ISO 8601)
- Moves from activeSession to sessions archive
- Sets activeSession to null

**Errors**:
- Throws `SessionNotFoundError` if session doesn't exist
- Throws `SessionStateError` if session already stopped
- Throws `StorageError` if chrome.storage.local fails

**FR Mapping**: FR-004 (stop button ends session)

---

#### `getSession(sessionId: string)`

Retrieves a specific session by ID.

**Input**:
- `sessionId`: string - Session identifier

**Output**: `Promise<RecordingSession | null>`
- Session object if found
- null if not found

**Side Effects**: None (read-only)

**Errors**:
- Throws `StorageError` if chrome.storage.local fails

**FR Mapping**: Used for log viewing and export

---

#### `listSessions(limit: number = 10)`

Lists recent sessions in reverse chronological order.

**Input**:
- `limit`: number (optional) - Maximum sessions to return (default: 10)

**Output**: `Promise<RecordingSession[]>`
- Array of sessions sorted by startTime (newest first)
- Limited to specified count
- Empty array if no sessions

**Side Effects**: None (read-only)

**Errors**:
- Throws `ValidationError` if limit < 1
- Throws `StorageError` if chrome.storage.local fails

**FR Mapping**: Used by log viewing interface

---

#### `deleteSession(sessionId: string)`

Permanently removes a session.

**Input**:
- `sessionId`: string - Session to delete

**Output**: `Promise<void>`

**Side Effects**:
- Removes session from chrome.storage.local
- Updates storageStats
- Cannot delete active session (must stop first)

**Errors**:
- Throws `SessionNotFoundError` if session doesn't exist
- Throws `ActiveSessionError` if trying to delete active session
- Throws `StorageError` if chrome.storage.local fails

**FR Mapping**: Storage management / cleanup

---

### Event Management

#### `addEvent(event: InteractionEvent)`

Adds an interaction event to the active session.

**Input**:
- `event`: InteractionEvent - Event to add (without sessionId)

**Output**: `Promise<void>`

**Side Effects**:
- Appends event to activeSession.events
- Updates session in chrome.storage.local
- Increments storageStats.totalEvents

**Errors**:
- Throws `NoActiveSessionError` if no session is recording
- Throws `ValidationError` if event object is invalid
- Throws `StorageError` if chrome.storage.local fails
- Throws `StorageQuotaError` if approaching storage limits

**FR Mapping**: FR-019 (accepted events added to output)

---

#### `getEvents(sessionId: string)`

Retrieves all events for a session.

**Input**:
- `sessionId`: string - Session identifier

**Output**: `Promise<InteractionEvent[]>`
- Array of events in chronological order
- Empty array if session has no events

**Side Effects**: None (read-only)

**Errors**:
- Throws `SessionNotFoundError` if session doesn't exist
- Throws `StorageError` if chrome.storage.local fails

**FR Mapping**: FR-020, FR-021 (log interface displays events)

---

### Configuration Management

#### `getConfig()`

Retrieves current event configuration.

**Input**: None

**Output**: `Promise<EventConfiguration>`
- Current configuration settings
- Returns default config if not yet set

**Side Effects**: None (read-only)

**Errors**:
- Throws `StorageError` if chrome.storage.local fails

**FR Mapping**: FR-017, FR-031 (event type customization)

---

#### `updateConfig(config: EventConfiguration)`

Updates event configuration settings.

**Input**:
- `config`: EventConfiguration - New configuration

**Output**: `Promise<void>`

**Side Effects**:
- Stores config in chrome.storage.local
- Settings persist across browser sessions (FR-032)
- If recording active, notifies content script to update listeners

**Errors**:
- Throws `ValidationError` if config object is invalid
- Throws `StorageError` if chrome.storage.local fails

**FR Mapping**: FR-032 (settings persist), FR-038 (apply during session)

---

#### `resetConfig()`

Resets configuration to default values.

**Input**: None

**Output**: `Promise<EventConfiguration>`
- Default configuration object

**Side Effects**:
- Stores default config in chrome.storage.local
- Notifies content script to update if recording active

**Errors**:
- Throws `StorageError` if chrome.storage.local fails

**FR Mapping**: Settings management

---

### Storage Management

#### `getStorageStats()`

Retrieves storage usage statistics.

**Input**: None

**Output**: `Promise<StorageStats>`
```javascript
{
  totalSessions: number,      // Count of sessions
  totalEvents: number,         // Count of all events
  estimatedBytes: number,      // Approximate storage used
  lastCleanup: string,         // ISO 8601 timestamp
  quotaUsagePercent: number    // % of chrome.storage.local quota used
}
```

**Side Effects**: None (read-only)

**Errors**:
- Throws `StorageError` if chrome.storage.local fails

**FR Mapping**: Used for warning threshold (5MB per edge case)

---

#### `cleanup()`

Removes old sessions to free storage space.

**Input**: None

**Output**: `Promise<CleanupResult>`
```javascript
{
  sessionsDeleted: number,
  eventsDeleted: number,
  bytesFreed: number
}
```

**Side Effects**:
- Deletes oldest sessions (keeps last 10)
- Never deletes active session
- Updates storageStats.lastCleanup

**Errors**:
- Throws `StorageError` if chrome.storage.local fails

**FR Mapping**: Storage management, performance edge case

---

#### `clearAllData()`

Permanently removes all sessions and resets configuration.

**Input**: None

**Output**: `Promise<void>`

**Side Effects**:
- Deletes all sessions including active
- Resets configuration to defaults
- Resets storageStats

**Errors**:
- Throws `StorageError` if chrome.storage.local fails

**FR Mapping**: User data management

---

## Error Types

```javascript
class StorageError extends Error {
  constructor(message: string, cause?: Error)
}

class SessionNotFoundError extends Error {
  constructor(sessionId: string)
}

class SessionExistsError extends Error {
  constructor(message: string)
}

class SessionStateError extends Error {
  constructor(message: string)
}

class NoActiveSessionError extends Error {}

class ActiveSessionError extends Error {
  constructor(message: string)
}

class ValidationError extends Error {
  constructor(field: string, reason: string)
}

class StorageQuotaError extends Error {
  constructor(bytesUsed: number, bytesAvailable: number)
}
```

---

## Implementation Notes

### Chrome Storage Structure

```javascript
// chrome.storage.local layout
{
  "activeSession": RecordingSession | null,
  "sessions": {
    "<sessionId-1>": RecordingSession,
    "<sessionId-2>": RecordingSession,
    // ... up to 10 archived sessions
  },
  "config": EventConfiguration,
  "storageStats": {
    "totalSessions": number,
    "totalEvents": number,
    "estimatedBytes": number,
    "lastCleanup": string,
    "quotaUsagePercent": number
  }
}
```

### Quota Management

- chrome.storage.local quota: QUOTA_BYTES (effectively unlimited)
- Warning threshold: 5MB (estimatedBytes)
- Automatic cleanup triggered at 5MB
- Priority: Active session always preserved

### Concurrency

- Single active session at a time
- Pause previous session if new session started
- Use chrome.storage.local atomic operations

### Performance

- Batch event additions when possible
- Use delta updates for session modifications
- Cache active session in memory
- Debounce storage writes (constitutional requirement)

---

## Testing Requirements (Manual)

Manual test scenarios for each method:

1. **Session Lifecycle**:
   - Create session → verify in storage
   - Update status → verify changes persist
   - Stop session → verify moved to archive
   - Delete session → verify removed

2. **Event Management**:
   - Add single event → verify appended
   - Add multiple events → verify order
   - Reach warning threshold → verify warning

3. **Configuration**:
   - Update config → verify persists after restart
   - Reset config → verify defaults restored

4. **Storage Management**:
   - Fill storage → verify cleanup triggers
   - Clear all → verify empty storage

5. **Error Handling**:
   - Create session while active → verify error
   - Add event without session → verify error
   - Stop non-existent session → verify error

6. **Edge Cases**:
   - Browser crash during recording → verify recovery
   - Storage quota exceeded → verify graceful handling
   - Concurrent tab updates → verify consistency
