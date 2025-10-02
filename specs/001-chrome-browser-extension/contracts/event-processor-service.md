# Event Processor Service Contract

**Service**: EventProcessorService  
**Purpose**: Process, filter, and roll up interaction events before storage  
**Key Features**: Event rollup (FR-033), event type filtering, annotation management

---

## Interface Definition

```javascript
class EventProcessorService {
  // Event Processing
  async processEvent(rawEvent: RawInteractionEvent): Promise<InteractionEvent | null>
  async rollupEvent(newEvent: RawInteractionEvent, recentEvents: InteractionEvent[]): Promise<InteractionEvent>
  
  // Filtering
  isEventEnabled(eventType: EventType, config: EventConfiguration): boolean
  shouldIgnoreElement(element: HTMLElement): boolean
  
  // Annotation
  async requestAnnotation(event: InteractionEvent): Promise<string>
  
  // Utilities
  extractElementDetails(element: HTMLElement): ElementDetails
  extractDOMContext(element: HTMLElement, config: EventConfiguration): DOMContext
  generateSelector(element: HTMLElement): string
  generateXPath(element: HTMLElement): string
}
```

---

## Method Specifications

### Event Processing

#### `processEvent(rawEvent: RawInteractionEvent)`

Main processing pipeline: filters, extracts details, prepares for storage.

**Input**: `RawInteractionEvent`
```javascript
{
  eventType: EventType,
  element: HTMLElement,
  timestamp: Date,
  pageTitle: string,
  pageUrl: string,
  textInput?: string,
  eventCount?: number
}
```

**Output**: `Promise<InteractionEvent | null>`
- Fully processed event ready for storage
- null if event should be ignored

**Process**:
1. Check if event type is enabled in config
2. Check if element should be ignored (extension UI)
3. Extract element details and DOM context
4. Generate selectors (CSS, XPath)
5. Format timestamp to ISO 8601
6. Return structured InteractionEvent

**Side Effects**: None (pure processing)

**Errors**:
- Returns null for invalid events (no throw)
- Logs warnings for processing failures

**FR Mapping**: All event capture requirements (FR-006 through FR-013)

---

#### `rollupEvent(newEvent: RawInteractionEvent, recentEvents: InteractionEvent[])`

Combines consecutive repeated interactions in same element into single event.

**Input**:
- `newEvent`: RawInteractionEvent - New event to process
- `recentEvents`: InteractionEvent[] - Recent events from active session (last 10)

**Output**: `Promise<InteractionEvent>`
- If rollup applicable: Updated existing event with incremented count/concatenated text
- If not applicable: New event

**Rollup Criteria** (FR-033):
- Same element (compare element reference or selector)
- Same event type (click with click, keypress with keypress)
- Consecutive interactions (no break events between)
- **Break events**: blur, focus change, element change, interaction type change

**Rollup Behavior**:
- **Clicks**: Increment eventCount, keep first timestamp
- **Keypresses**: Concatenate textInput, update timestamp to last
- **Other types**: No rollup (each event distinct)

**Example**:
```javascript
// First click on button
{ interactionType: 'click', selector: '#btn', eventCount: 1 }

// Second consecutive click → rolled up
{ interactionType: 'click', selector: '#btn', eventCount: 2 }

// User clicks elsewhere → breaks sequence
// Third click on same button → new event (not rolled up)
{ interactionType: 'click', selector: '#btn', eventCount: 1 }

// First keypress in field
{ interactionType: 'keypress', selector: '#input', textInput: 'hello' }

// Continue typing (consecutive) → rolled up
{ interactionType: 'keypress', selector: '#input', textInput: 'hello world' }

// Focus change (tab to next field) → breaks sequence
// Type in same field again → new event (not rolled up)
```

**Side Effects**: None (returns new/updated event object)

**Errors**: None (defensive - returns new event if rollup fails)

**FR Mapping**: FR-033 (roll up repeated interactions)

---

### Filtering

#### `isEventEnabled(eventType: EventType, config: EventConfiguration)`

Checks if a specific event type should be captured.

**Input**:
- `eventType`: EventType - Type to check
- `config`: EventConfiguration - Current user settings

**Output**: `boolean`
- true if event type is in config.enabledEventTypes
- false otherwise

**Side Effects**: None (read-only check)

**Errors**: None (defensive - returns false if invalid)

**FR Mapping**: FR-017 (customize event types)

---

#### `shouldIgnoreElement(element: HTMLElement)`

Determines if an element should not be tracked.

**Input**:
- `element`: HTMLElement - Element to check

**Output**: `boolean`
- true if element should be ignored
- false if element should be tracked

**Ignore Criteria**:
- Element is part of extension UI (class contains 'dom-tracker-')
- Element is annotation overlay
- Element is popup controls
- Element is sidepanel log view
- URL is chrome:// or chrome-extension://

**Side Effects**: None (read-only check)

**Errors**: None (defensive - returns false if check fails)

**FR Mapping**: FR edge case (don't track extension UI)

---

### Annotation

#### `requestAnnotation(event: InteractionEvent)`

Shows annotation UI and waits for user input.

**Input**:
- `event`: InteractionEvent - Event to annotate

**Output**: `Promise<string>`
- User-provided annotation text
- Empty string if user accepts without annotation
- Rejected promise if user rejects event

**Process**:
1. Show accept/reject popup (auto-focus accept button per FR-016)
2. If user accepts:
   - Show annotation input popup (auto-focus text field per FR-036)
   - Wait for user to enter text and save (or skip)
   - Return annotation text
3. If user rejects:
   - Reject promise (event will not be stored per FR-018)

**UI Flow**:
```
Accept/Reject Popup
├─ [Accept] (auto-focused) → Enter → Annotation Popup
│                                    ├─ [Text Input] (auto-focused) → type → Tab
│                                    └─ [Save] → Enter → Returns annotation
└─ [Reject] (Tab from Accept) → Enter → Rejects promise
```

**Side Effects**:
- Shows/hides annotation overlays
- Pauses event capture while waiting for user

**Errors**:
- Rejects promise if user clicks reject
- Rejects promise if user presses Escape

**FR Mapping**: FR-015, FR-016, FR-034, FR-035, FR-036 (annotation UI)

---

### Utilities

#### `extractElementDetails(element: HTMLElement)`

Captures comprehensive information about an element.

**Input**:
- `element`: HTMLElement - Target element

**Output**: `ElementDetails`
```javascript
{
  html: string,              // outerHTML
  selector: string,          // CSS selector
  tagName: string,           // Uppercase tag name
  id: string | null,         // ID attribute
  classes: string[],         // Array of classes
  textContent: string,       // Text content (trimmed, truncated if >1000 chars)
  attributes: object,        // Relevant attributes (type, name, value, placeholder, etc.)
  domContext: DOMContext     // Parent/sibling context
}
```

**Side Effects**: None (read-only extraction)

**Errors**: None (defensive - returns minimal details if extraction fails)

**FR Mapping**: FR-010 (element details), FR-011 (DOM context)

---

#### `extractDOMContext(element: HTMLElement, config: EventConfiguration)`

Captures surrounding DOM structure for element location.

**Input**:
- `element`: HTMLElement - Target element
- `config`: EventConfiguration - Settings for depth limits

**Output**: `DOMContext`
```javascript
{
  parents: ParentInfo[],     // Up to maxDOMDepth (default 5)
  siblings: {
    previous: string | null, // Previous sibling HTML (if exists)
    next: string | null      // Next sibling HTML (if exists)
  },
  xpath: string              // XPath to element
}
```

**Parent Traversal**:
- Start at element.parentElement
- Walk up DOM tree
- Capture up to config.maxDOMDepth parents (default 5)
- Stop at document.body or maxDepth

**Sibling Capture**:
- Get element.previousElementSibling
- Get element.nextElementSibling
- Capture up to config.maxSiblings each direction (default 2)
- Store outerHTML (truncated if >500 chars)

**Side Effects**: None (read-only traversal)

**Errors**: None (defensive - returns minimal context if traversal fails)

**FR Mapping**: FR-011 (DOM context for disambiguation)

---

#### `generateSelector(element: HTMLElement)`

Creates a unique CSS selector for an element.

**Input**:
- `element`: HTMLElement - Element to select

**Output**: `string`
- CSS selector that uniquely identifies element
- Prefers ID selector if available
- Falls back to class/attribute selectors
- Uses nth-child if necessary

**Selector Strategy**:
1. If element has ID: `#element-id`
2. If unique classes: `tag.class1.class2`
3. If unique attributes: `tag[name="value"]`
4. If parent + child: `parent > tag.class:nth-child(n)`

**Examples**:
```css
#login-button
input.username-field
button[type="submit"]
form > div:nth-child(2) > input.email
```

**Side Effects**: None (read-only)

**Errors**: None (defensive - returns tag name if selector generation fails)

**FR Mapping**: FR-010 (element identification for POM generation)

---

#### `generateXPath(element: HTMLElement)`

Creates an XPath expression for an element.

**Input**:
- `element`: HTMLElement - Element to locate

**Output**: `string`
- XPath expression to element
- Absolute path from document root

**XPath Strategy**:
- Walk up DOM to build path
- Use tag names and positions
- Include predicates for attributes if helpful

**Example**:
```xpath
/html/body/div[1]/form/input[@id='username']
```

**Side Effects**: None (read-only)

**Errors**: None (defensive - returns simple path if generation fails)

**FR Mapping**: FR-011 (alternative locator for test automation)

---

## Data Types

### RawInteractionEvent

Raw event data from content script before processing.

```javascript
{
  eventType: EventType,
  element: HTMLElement,
  timestamp: Date,
  pageTitle: string,
  pageUrl: string,
  textInput?: string,       // For keypress events
  eventCount?: number,      // For pre-rolled events
  keyCode?: string          // For special keys (ENTER, TAB, etc.)
}
```

### EventType

```javascript
type EventType = 
  | 'click' 
  | 'dblclick' 
  | 'keypress' 
  | 'hover' 
  | 'scroll' 
  | 'focus' 
  | 'blur' 
  | 'navigation';
```

---

## Event Rollup Algorithm

### Consecutive Interaction Tracking

**Principle**: Roll up events only when they are consecutive (uninterrupted) interactions on the same element with the same type.

**Break Conditions** (stop rollup, start new event):
1. **Element change**: Different target element
2. **Type change**: Different interaction type (e.g., click → keypress)
3. **Focus change**: blur or focus event on any element
4. **Explicit break**: User rejects/accepts annotation (creates boundary)

### Same Element Detection

```javascript
function isSameElement(elem1, elem2, event1, event2) {
  // Same element reference
  if (elem1 === elem2) return true;
  
  // Same selector (for cross-capture comparison)
  if (event1.elementDetails.selector === event2.elementDetails.selector) {
    return true;
  }
  
  return false;
}
```

### Rollup Logic

```javascript
function shouldRollup(newEvent, lastAcceptedEvent, contextBroken) {
  // Context was broken by focus/blur/element/type change
  if (contextBroken) {
    return false;
  }
  
  // Must be same type
  if (newEvent.interactionType !== lastAcceptedEvent.interactionType) {
    return false;
  }
  
  // Must be same element
  if (!isSameElement(newEvent.element, lastAcceptedEvent.elementDetails.selector)) {
    return false;
  }
  
  // Only roll up clicks and keypresses
  if (!['click', 'keypress'].includes(newEvent.interactionType)) {
    return false;
  }
  
  return true;
}

function isBreakEvent(event) {
  return ['blur', 'focus'].includes(event.interactionType);
}
```

### Click Rollup

```javascript
function rollupClick(existingEvent, newEvent) {
  return {
    ...existingEvent,
    eventCount: (existingEvent.eventCount || 1) + 1,
    // Keep first timestamp
  };
}
```

### Keypress Rollup

```javascript
function rollupKeypress(existingEvent, newEvent) {
  return {
    ...existingEvent,
    textInput: existingEvent.textInput + newEvent.textInput,
    timestamp: newEvent.timestamp.toISOString(), // Update to latest
    eventCount: (existingEvent.eventCount || 1) + 1,
  };
}
```

### Implementation State Tracking

The content script needs to maintain:
```javascript
{
  lastAcceptedEvent: InteractionEvent | null,  // Last event user accepted
  contextBroken: boolean,                       // Was there a break event?
  currentFocusedElement: HTMLElement | null     // Currently focused element
}
```

**Update on each raw event**:
- If blur/focus event: set contextBroken = true
- If element change: set contextBroken = true  
- If type change: set contextBroken = true
- If event accepted: update lastAcceptedEvent, reset contextBroken = false
- If event rejected: keep contextBroken state (continue sequence possibility)

---

## Performance Considerations

### DOM Traversal

- Limit parent depth (maxDOMDepth: 5)
- Limit sibling capture (maxSiblings: 2)
- Cache selectors if possible
- Avoid full tree walks

### Selector Generation

- Prefer ID selectors (O(1) lookup)
- Cache generated selectors per element
- Use WeakMap for element → selector mapping

### Event Queue

- Process events asynchronously
- Batch annotation requests if rapid interactions
- Queue events during annotation to avoid blocking

---

## Testing Requirements (Manual)

Manual test scenarios:

1. **Event Rollup**:
   - Click button rapidly 5 times
   - Verify single event with eventCount=5
   - Type "hello world" in field
   - Verify single event with full text

2. **Event Filtering**:
   - Disable click events in settings
   - Click elements
   - Verify no events captured
   - Enable again and verify capture resumes

3. **Element Ignore**:
   - Click extension popup buttons
   - Verify not tracked
   - Click page elements
   - Verify tracked

4. **Annotation Flow**:
   - Trigger event
   - Verify accept button auto-focused
   - Press Enter to accept
   - Verify annotation input auto-focused
   - Type annotation and Tab to Save
   - Press Enter to save
   - Verify annotation stored

5. **Reject Flow**:
   - Trigger event
   - Tab to Reject button
   - Press Enter to reject
   - Verify event not stored

6. **Special Keys**:
   - Type in field with ENTER, TAB, BACKSPACE
   - Verify special keys captured with labels
   - Verify rolled into single event

7. **DOM Context**:
   - Interact with deeply nested element
   - Export and check parents array
   - Verify 5 levels captured

8. **Selector Generation**:
   - Interact with element with ID
   - Verify selector is #id
   - Interact with element without ID
   - Verify selector uses classes/attributes

9. **Performance**:
   - Rapid interactions (100 events in 10 seconds)
   - Verify no page lag
   - Verify events rolled up appropriately

10. **Edge Cases**:
    - Interact with iframe elements
    - Interact with shadow DOM elements
    - Interact during page load
    - Interact with dynamic content
