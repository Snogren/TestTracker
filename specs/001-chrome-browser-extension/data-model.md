# Data Model: Chrome Interaction Recorder Extension

**Feature**: Chrome Interaction Recorder Extension  
**Date**: 2025-10-02  
**Source**: Derived from spec.md functional requirements

## Core Entities

### RecordingSession

Represen3. **Capture Event**:
   - Content script detects interaction
   - Check if event type is enabled in config
   - Extract element details and DOM context
   - Create InteractionEvent object
   - Show annotation overlay (FR-015, FR-016)
   - User accepts/rejects/annotates

4. **Accept Event** (FR-019):
   - Add annotation from user input (or empty string)
   - Apply event rollup if consecutive interaction in same element + same type (FR-033)
     - Consecutive = no blur, focus change, element change, or type change between events
   - Append to activeSession.events or update existing event if rolled up
   - Update chrome.storage.local
   - Update log view UIrecording from start to stop.

**Fields**:
- `sessionId`: string (UUID) - Unique identifier for the session
- `startTime`: string (ISO 8601) - When recording started
- `endTime`: string | null (ISO 8601) - When recording stopped (null if active)
- `status`: enum ('recording', 'paused', 'stopped') - Current session state
- `events`: InteractionEvent[] - Array of captured interactions
- `metadata`: object - Additional session information
  - `browserInfo`: string - Chrome version
  - `totalEvents`: number - Count of events

**Validation Rules**:
- sessionId must be unique and non-empty
- startTime must be valid ISO 8601 timestamp
- endTime must be null or valid ISO 8601 timestamp after startTime
- status must be one of the three allowed values
- events array must be valid (can be empty)

**State Transitions**:
```
null → 'recording' (on record button)
'recording' → 'paused' (on pause button)
'paused' → 'recording' (on resume button)
'recording' | 'paused' → 'stopped' (on stop button)
'stopped' → [session archived/exported]
```

**Relationships**:
- Has many: InteractionEvent

---

### InteractionEvent

Represents a single user action captured during recording.

**Fields** (in FR-014 required order):
- `pageTitle`: string - Page title at time of interaction
- `annotation`: string - User-provided description/notes
- `interactionType`: enum - Type of interaction (see EventType)
- `textInput`: string | null - Text entered (for keypress events)
- `url`: string - Full URL at time of interaction
- `elementDetails`: ElementDetails - Information about the target element
- `timestamp`: string (ISO 8601) - When interaction occurred
- `eventCount`: number | null - Number of rolled-up events (for repeated actions)

**Validation Rules**:
- annotation must be a string (can be empty if user doesn't annotate)
- interactionType must be valid EventType
- pageTitle must be non-empty string
- url must be valid URL format
- elementDetails must be valid ElementDetails object
- timestamp must be valid ISO 8601 timestamp
- textInput required for keypress type, null otherwise
- eventCount required for rolled-up events, null for single events

**Relationships**:
- Belongs to: RecordingSession
- Has one: ElementDetails
- Has one: DOMContext (nested in ElementDetails)

---

### ElementDetails

Information about the DOM element that was interacted with.

**Fields**:
- `html`: string - Outer HTML of the element
- `selector`: string - CSS selector to locate element
- `tagName`: string - HTML tag name (e.g., 'INPUT', 'BUTTON')
- `id`: string | null - Element ID attribute
- `classes`: string[] - Array of CSS classes
- `textContent`: string - Visible text content of element
- `attributes`: object - Key-value pairs of important attributes
  - `type`: string | null - Input type, button type, etc.
  - `name`: string | null - Form element name
  - `value`: string | null - Current value
  - `placeholder`: string | null - Placeholder text
  - [other relevant attributes as needed]
- `domContext`: DOMContext - Surrounding DOM structure

**Validation Rules**:
- html must be non-empty string
- selector must be non-empty string (valid CSS selector)
- tagName must be non-empty string (uppercase)
- classes must be valid array (can be empty)
- textContent must be string (can be empty)
- attributes must be valid object
- domContext must be valid DOMContext object

**Relationships**:
- Belongs to: InteractionEvent
- Has one: DOMContext

---

### DOMContext

The surrounding DOM structure to provide location context for an element.

**Fields**:
- `parents`: ParentInfo[] - Array of parent elements (up to 5 levels)
- `siblings`: object - Adjacent elements
  - `previous`: string | null - Previous sibling HTML (if exists)
  - `next`: string | null - Next sibling HTML (if exists)
- `xpath`: string - XPath to element (alternative locator)

**ParentInfo Structure**:
- `tagName`: string - Parent tag name
- `selector`: string - CSS selector for parent
- `id`: string | null - Parent ID
- `classes`: string[] - Parent classes

**Validation Rules**:
- parents must be array (can be empty)
- parents limited to maximum 5 elements
- each ParentInfo must have valid tagName and selector
- siblings.previous and siblings.next can be null
- xpath must be non-empty string

**Relationships**:
- Belongs to: ElementDetails

---

### EventConfiguration

User preferences for which interaction types should be captured.

**Fields**:
- `enabledEventTypes`: EventType[] - Array of enabled interaction types
- `maxDOMDepth`: number - Maximum parent levels to capture (default: 5)
- `maxSiblings`: number - Maximum siblings each direction (default: 2)

**Validation Rules**:
- enabledEventTypes must be array of valid EventType values
- enabledEventTypes must contain at least one type
- maxDOMDepth must be number >= 1 and <= 10
- maxSiblings must be number >= 0 and <= 5

**Default Values**:
```javascript
{
  enabledEventTypes: ['click', 'keypress', 'focus', 'blur', 'scroll', 'navigation'],
  maxDOMDepth: 5,
  maxSiblings: 2
}
```

**Persistence**:
- Stored in chrome.storage.local
- Persists across browser sessions (FR-032)
- Applies globally to all recording sessions

---

## Enums

### EventType

Supported interaction types that can be captured.

**Values**:
- `click` - Mouse click on element
- `dblclick` - Double-click on element
- `keypress` - Keyboard input (rolled up per field)
- `hover` - Mouse hover over element
- `scroll` - Page or element scroll
- `focus` - Element receives focus
- `blur` - Element loses focus
- `navigation` - Page navigation/URL change

**Notes**:
- Default enabled: all except hover (performance concern)
- Extensible for future event types

### SessionStatus

Current state of a recording session.

**Values**:
- `recording` - Actively capturing events
- `paused` - Temporarily suspended
- `stopped` - Ended, ready for export

---

## Storage Schema

### chrome.storage.local Structure

```javascript
{
  // Current active session (if any)
  "activeSession": RecordingSession | null,
  
  // Historical sessions (last 10)
  "sessions": {
    "<sessionId>": RecordingSession,
    // ... up to 10 sessions
  },
  
  // User configuration
  "config": EventConfiguration,
  
  // Storage metrics
  "storageStats": {
    "totalSessions": number,
    "totalEvents": number,
    "estimatedBytes": number,
    "lastCleanup": string (ISO 8601)
  }
}
```

**Storage Limits**:
- Warning threshold: 5MB of session data (per FR edge case)
- Automatic cleanup: Remove oldest sessions when threshold approached
- Active session always preserved (data persistence priority)

---

## Data Flow

### Recording Lifecycle

1. **Start Recording** (FR-001):
   - Create new RecordingSession with status='recording'
   - Generate sessionId (UUID v4)
   - Set startTime (ISO 8601)
   - Initialize empty events array
   - Store as activeSession in chrome.storage.local

2. **Capture Event**:
   - Content script detects interaction
   - Check if event type is enabled in config
   - Extract element details and DOM context
   - Create InteractionEvent object
   - Show annotation overlay (FR-015, FR-016)
   - User accepts/rejects/annotates

3. **Accept Event** (FR-019):
   - Add annotation from user input (or empty string)
   - Apply event rollup if same element + type (FR-033)
   - Append to activeSession.events
   - Update chrome.storage.local
   - Update log view UI

4. **Reject Event** (FR-018):
   - Discard InteractionEvent
   - Do not add to session
   - Continue recording

5. **Pause Recording** (FR-002):
   - Update activeSession.status = 'paused'
   - Stop event listeners in content script
   - Update chrome.storage.local

6. **Resume Recording** (FR-003):
   - Update activeSession.status = 'recording'
   - Re-enable event listeners
   - Continue in same session
   - Update chrome.storage.local

7. **Stop Recording** (FR-004):
   - Update activeSession.status = 'stopped'
   - Set endTime (ISO 8601)
   - Generate JSON export (see Export Format)
   - Trigger browser download (FR-027)
   - Move session from activeSession to sessions archive
   - Update chrome.storage.local

---

## Export Format

### JSON Structure (FR-024, FR-025, FR-026)

Top-level fields provide high-level summary. Detailed fields nested in objects.

```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "startTime": "2025-10-02T14:30:00.000Z",
  "endTime": "2025-10-02T14:35:00.000Z",
  "totalEvents": 15,
  "browserInfo": "Chrome/119.0.0.0",
  "events": [
    {
      "annotation": "User navigated to login page",
      "interactionType": "navigation",
      "pageTitle": "Welcome - Example App",
      "url": "https://example.com/login",
      "elementDetails": {
        "html": "<a href='/login' class='nav-link'>Login</a>",
        "selector": "nav > a.nav-link[href='/login']",
        "tagName": "A",
        "id": null,
        "classes": ["nav-link"],
        "textContent": "Login",
        "attributes": {
          "href": "/login"
        },
        "domContext": {
          "parents": [
            {
              "tagName": "NAV",
              "selector": "nav.main-nav",
              "id": "main-nav",
              "classes": ["main-nav"]
            },
            {
              "tagName": "HEADER",
              "selector": "header.site-header",
              "id": null,
              "classes": ["site-header"]
            }
          ],
          "siblings": {
            "previous": "<a href='/home'>Home</a>",
            "next": "<a href='/signup'>Sign Up</a>"
          },
          "xpath": "/html/body/header/nav/a[2]"
        }
      },
      "timestamp": "2025-10-02T14:30:05.123Z",
      "textInput": null,
      "eventCount": null
    },
    {
      "annotation": "Entered username",
      "interactionType": "keypress",
      "pageTitle": "Login - Example App",
      "url": "https://example.com/login",
      "elementDetails": {
        "html": "<input id='username' type='text' name='username' placeholder='Email or Username'>",
        "selector": "#username",
        "tagName": "INPUT",
        "id": "username",
        "classes": ["form-input"],
        "textContent": "",
        "attributes": {
          "type": "text",
          "name": "username",
          "placeholder": "Email or Username"
        },
        "domContext": {
          "parents": [
            {
              "tagName": "DIV",
              "selector": "div.form-group",
              "id": null,
              "classes": ["form-group"]
            },
            {
              "tagName": "FORM",
              "selector": "form#login-form",
              "id": "login-form",
              "classes": ["login-form"]
            }
          ],
          "siblings": {
            "previous": "<label for='username'>Username</label>",
            "next": "<input id='password' type='password'>"
          },
          "xpath": "/html/body/main/form/div[1]/input"
        }
      },
      "timestamp": "2025-10-02T14:30:12.456Z",
      "textInput": "john.doe@example.com",
      "eventCount": 21
    }
  ]
}
```

**Property Order** (FR-014):
1. annotation
2. interactionType
3. pageTitle
4. url
5. elementDetails (object)
   - html
   - selector
   - tagName
   - id
   - classes
   - textContent
   - attributes
   - domContext (object)

**File Naming** (FR-037):
- Format: `dom-tracker-YYYYMMDD-HHMMSS.json`
- Example: `dom-tracker-20251002-143500.json`
- Timestamp in local time zone

---

## Data Integrity

### Validation Points

1. **On Event Capture**:
   - Validate event type is enabled
   - Ensure element is not extension UI
   - Verify URL is not chrome:// or chrome-extension://

2. **On Annotation Accept**:
   - Validate annotation is string
   - Ensure element details are complete
   - Verify timestamp is set

3. **On Session Stop**:
   - Validate endTime > startTime
   - Ensure events array is valid
   - Verify session has at least one event (warn if empty)

4. **On Export**:
   - Validate JSON structure matches schema
   - Ensure all required fields present
   - Verify property order (FR-014)

### Error Handling

- **Storage Full**: Display warning, disable new recordings until cleanup
- **Invalid Event**: Log error, skip event, continue recording
- **Export Failure**: Retry download, fall back to clipboard copy
- **Session Corruption**: Attempt recovery, worst case discard session

---

## Performance Considerations

### Memory Optimization

- Limit active session to 10,000 events (warn at 5,000)
- Use event rollup to reduce count (FR-033)
- Lazy-load DOM context in log view
- Clear old sessions automatically

### Storage Optimization

- Compress JSON before storage (optional enhancement)
- Limit DOMContext depth (maxDOMDepth: 5)
- Limit sibling capture (maxSiblings: 2 each side)
- Truncate very long textContent (>1000 chars)

### Query Performance

- Index sessions by sessionId
- Sort events by timestamp (already in capture order)
- Use pagination for log view (100 events per page)

---

## Future Extensibility

**Potential Additions** (not in current scope):
- Screenshots for each interaction
- Network request correlation
- Performance timing data
- Custom element property capture
- Session comparison/diff
- Cloud sync

**Maintaining Backward Compatibility**:
- Version field in RecordingSession
- Schema migration scripts if structure changes
- Export format versioning
