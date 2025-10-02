# Export Service Contract

**Service**: ExportService  
**Purpose**: Generate and download JSON files from recording sessions  
**Export Format**: JSON with nested structure per FR-024, FR-025, FR-026

---

## Interface Definition

```javascript
class ExportService {
  // Export Operations
  async exportSession(sessionId: string): Promise<ExportResult>
  async generateJSON(session: RecordingSession): Promise<string>
  async downloadJSON(filename: string, content: string): Promise<void>
  
  // Format Utilities
  formatFilename(session: RecordingSession): string
  validateJSONStructure(json: string): ValidationResult
}
```

---

## Method Specifications

### Export Operations

#### `exportSession(sessionId: string)`

Complete export workflow: generate JSON and trigger browser download.

**Input**:
- `sessionId`: string - Session to export

**Output**: `Promise<ExportResult>`
```javascript
{
  success: boolean,
  filename: string,
  sizeBytes: number,
  eventCount: number,
  error?: string
}
```

**Process**:
1. Retrieve session from storage
2. Validate session is stopped (or stop it)
3. Generate JSON with proper structure
4. Format filename with timestamp
5. Trigger browser download via chrome.downloads API

**Side Effects**:
- Downloads file to user's default download location
- Browser shows download prompt (FR-027)

**Errors**:
- Throws `SessionNotFoundError` if session doesn't exist
- Throws `ExportError` if JSON generation fails
- Throws `DownloadError` if browser download fails

**FR Mapping**: FR-004 (stop triggers export), FR-027 (download via browser)

---

#### `generateJSON(session: RecordingSession)`

Converts a RecordingSession to properly formatted JSON string.

**Input**:
- `session`: RecordingSession - Session to convert

**Output**: `Promise<string>`
- JSON string with proper structure and formatting
- Indented with 2 spaces for readability
- Property order per FR-014

**Format** (FR-024, FR-025, FR-026):
```json
{
  "sessionId": "uuid",
  "startTime": "ISO 8601",
  "endTime": "ISO 8601",
  "totalEvents": 15,
  "browserInfo": "Chrome/119.0.0.0",
  "events": [
    {
      "annotation": "string",
      "interactionType": "click|keypress|...",
      "pageTitle": "string",
      "url": "string",
      "elementDetails": {
        "html": "string",
        "selector": "string",
        "tagName": "string",
        "id": "string | null",
        "classes": ["string"],
        "textContent": "string",
        "attributes": { },
        "domContext": {
          "parents": [{ }],
          "siblings": { },
          "xpath": "string"
        }
      },
      "timestamp": "ISO 8601",
      "textInput": "string | null",
      "eventCount": "number | null"
    }
  ]
}
```

**Validation**:
- Property order enforced (FR-014)
- Nested structure with collapsible details (FR-025, FR-026)
- All required fields present
- Valid JSON syntax

**Side Effects**: None (pure function)

**Errors**:
- Throws `ValidationError` if session object invalid
- Throws `SerializationError` if JSON generation fails

**FR Mapping**: FR-024 (JSON generation), FR-014 (property order)

---

#### `downloadJSON(filename: string, content: string)`

Triggers browser download with specified filename and content.

**Input**:
- `filename`: string - Name for downloaded file
- `content`: string - JSON content to download

**Output**: `Promise<void>`

**Process**:
1. Create blob from content (type: application/json)
2. Generate object URL
3. Use chrome.downloads.download() API
4. Prompt user for save location (FR-027)

**Side Effects**:
- Triggers browser download
- User can edit filename and choose location

**Errors**:
- Throws `DownloadError` if download fails
- Throws `PermissionError` if downloads permission missing

**FR Mapping**: FR-027 (file explorer download window)

---

### Format Utilities

#### `formatFilename(session: RecordingSession)`

Generates standardized filename with timestamp.

**Input**:
- `session`: RecordingSession - Session to name

**Output**: `string`
- Format: `dom-tracker-YYYYMMDD-HHMMSS.json`
- Example: `dom-tracker-20251002-143500.json`
- Timestamp from session.startTime in local timezone

**Side Effects**: None (pure function)

**Errors**: None (defensive - returns default if session invalid)

**FR Mapping**: FR-037 (filename with timestamp to seconds)

---

#### `validateJSONStructure(json: string)`

Verifies exported JSON matches required structure.

**Input**:
- `json`: string - JSON content to validate

**Output**: `ValidationResult`
```javascript
{
  valid: boolean,
  errors: string[],
  warnings: string[]
}
```

**Checks**:
- Valid JSON syntax
- Required top-level fields present
- Property order correct (FR-014)
- Event objects have required fields
- Nested structure matches spec (FR-025, FR-026)
- Supports POM generation (FR-028)
- Supports test case design (FR-029)
- Supports action summaries (FR-030)

**Side Effects**: None (read-only validation)

**Errors**: None (returns validation result)

**FR Mapping**: FR-014, FR-024, FR-025, FR-026, FR-028, FR-029, FR-030

---

## JSON Schema

### Top-Level Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["sessionId", "startTime", "endTime", "totalEvents", "browserInfo", "events"],
  "properties": {
    "sessionId": {
      "type": "string",
      "format": "uuid"
    },
    "startTime": {
      "type": "string",
      "format": "date-time"
    },
    "endTime": {
      "type": "string",
      "format": "date-time"
    },
    "totalEvents": {
      "type": "integer",
      "minimum": 0
    },
    "browserInfo": {
      "type": "string"
    },
    "events": {
      "type": "array",
      "items": { "$ref": "#/definitions/InteractionEvent" }
    }
  }
}
```

### InteractionEvent Schema

```json
{
  "definitions": {
    "InteractionEvent": {
      "type": "object",
      "required": ["annotation", "interactionType", "pageTitle", "url", "elementDetails", "timestamp"],
      "properties": {
        "annotation": { "type": "string" },
        "interactionType": {
          "type": "string",
          "enum": ["click", "dblclick", "keypress", "hover", "scroll", "focus", "blur", "navigation"]
        },
        "pageTitle": { "type": "string" },
        "url": { "type": "string", "format": "uri" },
        "elementDetails": { "$ref": "#/definitions/ElementDetails" },
        "timestamp": { "type": "string", "format": "date-time" },
        "textInput": { "type": ["string", "null"] },
        "eventCount": { "type": ["integer", "null"], "minimum": 1 }
      },
      "propertyOrder": ["annotation", "interactionType", "pageTitle", "url", "elementDetails", "timestamp", "textInput", "eventCount"]
    }
  }
}
```

### ElementDetails Schema

```json
{
  "definitions": {
    "ElementDetails": {
      "type": "object",
      "required": ["html", "selector", "tagName", "domContext"],
      "properties": {
        "html": { "type": "string" },
        "selector": { "type": "string" },
        "tagName": { "type": "string" },
        "id": { "type": ["string", "null"] },
        "classes": { "type": "array", "items": { "type": "string" } },
        "textContent": { "type": "string" },
        "attributes": { "type": "object" },
        "domContext": { "$ref": "#/definitions/DOMContext" }
      }
    }
  }
}
```

### DOMContext Schema

```json
{
  "definitions": {
    "DOMContext": {
      "type": "object",
      "required": ["parents", "siblings", "xpath"],
      "properties": {
        "parents": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["tagName", "selector"],
            "properties": {
              "tagName": { "type": "string" },
              "selector": { "type": "string" },
              "id": { "type": ["string", "null"] },
              "classes": { "type": "array", "items": { "type": "string" } }
            }
          },
          "maxItems": 5
        },
        "siblings": {
          "type": "object",
          "properties": {
            "previous": { "type": ["string", "null"] },
            "next": { "type": ["string", "null"] }
          }
        },
        "xpath": { "type": "string" }
      }
    }
  }
}
```

---

## Property Order Enforcement (FR-014)

The export must maintain this exact property order:

### Event Properties (Top Level):
1. annotation
2. interactionType
3. pageTitle
4. url
5. elementDetails
6. timestamp
7. textInput
8. eventCount

### ElementDetails Properties:
1. html
2. selector
3. tagName
4. id
5. classes
6. textContent
7. attributes
8. domContext

### Implementation Strategy:
- Use object literal with properties in correct order
- Avoid Object.assign() or spread that may reorder
- Use JSON.stringify with custom replacer if needed
- Validate order in `validateJSONStructure()`

---

## Use Case Support

### FR-028: Page Object Model Generation

JSON must provide:
- **Element locators**: selector, id, xpath
- **Element context**: parents provide page hierarchy
- **Element properties**: attributes for element identification
- **Interaction patterns**: interactionType shows element purpose

Example POM extraction:
```javascript
// From JSON events, extract unique elements
const loginButton = {
  selector: "#login-submit",
  xpath: "//button[@id='login-submit']",
  text: "Sign In",
  actions: ["click"]
};
```

### FR-029: Test Case Design

JSON must provide:
- **User flow**: Events in chronological order
- **Test steps**: annotation + interactionType → test step
- **Assertions**: pageTitle, url for navigation verification
- **Test data**: textInput for form input values

Example test case:
```gherkin
Scenario: User logs in
  Given the user navigates to "https://example.com/login"
  When the user enters "john@example.com" in "#username"
  And the user enters password in "#password"
  And the user clicks "#login-submit"
  Then the page title should be "Dashboard"
```

### FR-030: User Action Summary

JSON must provide:
- **High-level actions**: annotation describes intent
- **Interaction flow**: url + pageTitle show navigation
- **Key interactions**: textInput shows data entry
- **Outcome**: Final url/pageTitle shows result

Example summary:
```
User Session Summary:
1. Navigated to login page
2. Entered credentials (username: john@example.com)
3. Submitted login form
4. Accessed dashboard (successful login)
Total duration: 5 minutes
Total interactions: 15 events
```

---

## Error Types

```javascript
class ExportError extends Error {
  constructor(message: string, cause?: Error)
}

class SerializationError extends Error {
  constructor(message: string, cause?: Error)
}

class DownloadError extends Error {
  constructor(message: string, cause?: Error)
}

class PermissionError extends Error {
  constructor(permission: string)
}
```

---

## Implementation Notes

### JSON Formatting

- Indent: 2 spaces
- Line endings: LF (\n)
- Encoding: UTF-8
- BOM: None

### Browser Compatibility

- Use chrome.downloads API (Manifest V3)
- Fallback: Create blob URL and programmatic click
- Require "downloads" permission in manifest.json

### Performance

- Stream large sessions (>1000 events)
- Consider chunked export for very large files
- Estimate size before generation (warn if >10MB)

### Security

- Sanitize HTML content in export (escape script tags)
- Validate URLs before export
- No personally identifiable information (PII) scrubbing (user responsibility)

---

## Testing Requirements (Manual)

Manual test scenarios:

1. **Basic Export**:
   - Record session with events
   - Stop and export
   - Verify JSON structure and property order
   - Verify filename format

2. **Empty Session**:
   - Record session with no events
   - Verify export still works
   - Check for empty events array

3. **Large Session**:
   - Record 1000+ events
   - Verify export completes
   - Check file size and download time

4. **Special Characters**:
   - Record events with HTML, Unicode, emojis
   - Verify proper escaping in JSON
   - Test JSON parses correctly

5. **POM Generation**:
   - Export session
   - Manually extract selectors
   - Verify sufficient data for POM

6. **Test Case Design**:
   - Export session
   - Manually create test case from events
   - Verify sufficient data for test steps

7. **User Summary**:
   - Export session
   - Create high-level summary from annotations
   - Verify readability

8. **Download Flow**:
   - Verify save dialog appears (FR-027)
   - Test filename editing
   - Test location selection
   - Verify file saved correctly

9. **Error Handling**:
   - Export non-existent session
   - Export active session (should stop first)
   - Simulate download failure
   - Verify error messages
