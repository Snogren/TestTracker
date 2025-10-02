# Research: Chrome Interaction Recorder Extension

**Feature**: Chrome Interaction Recorder Extension  
**Date**: 2025-10-02  
**Status**: Complete

## Research Questions

### 1. Chrome Extension Manifest V3 Architecture

**Decision**: Use Manifest V3 with service worker background script, content scripts, and sidepanel API

**Rationale**:
- Manifest V3 is the current standard and will be required for all Chrome extensions
- Service workers replace persistent background pages, providing better performance
- Content scripts can inject tracking logic directly into web pages
- Sidepanel API (Chrome 114+) provides a better UX for log viewing than traditional popups
- Popup remains useful for quick recording controls

**Alternatives Considered**:
- Manifest V2: Deprecated and being phased out by Chrome
- Extension popup only: Too limited for displaying comprehensive logs
- DevTools panel: Would require opening DevTools, more disruptive to workflow

### 2. Event Capture Strategy

**Decision**: Use event listeners with capture phase, debouncing for repeated events, and MutationObserver for DOM changes

**Rationale**:
- Capture phase ensures we intercept events before page handlers
- Debouncing prevents excessive logging for rapid clicks/keypresses (constitutional performance requirement)
- MutationObserver can detect dynamic content changes for better context
- Event delegation from document root minimizes performance impact

**Alternatives Considered**:
- Polling: Too inefficient and would degrade page performance
- Monkey-patching DOM methods: Fragile and could break page functionality
- Recording all events: Would create excessive data and degrade performance

### 3. DOM Context Extraction

**Decision**: Capture element HTML, parent chain with selectors, and sibling context (limited depth)

**Rationale**:
- Element HTML provides the exact target
- Parent chain with CSS selectors enables recreating element location for POM generation
- Sibling context helps disambiguate elements with similar selectors
- Limiting depth (e.g., 5 parents, 2 siblings each direction) prevents excessive data
- Supports FR-028 (Page Object Model generation) and FR-030 (action summaries)

**Alternatives Considered**:
- Full DOM snapshot: Too much data, would violate performance constraints
- XPath only: Less familiar to most test engineers than CSS selectors
- Element selector only: Insufficient context for disambiguation

### 4. Event Rollup Implementation

**Decision**: Use consecutive interaction tracking with context break detection for clicks and keypresses

**Rationale**:
- FR-033 requires rolling up repeated interactions in same element
- Consecutive interactions = uninterrupted sequence on same element
- Break on: blur event, focus change, element change, interaction type change
- Same element detection uses element reference comparison (fast)
- Separate rollup logic for clicks (count) vs keypresses (concatenate text)
- Final event includes count/full text plus timing info
- More accurate than time-based approach (doesn't merge distinct actions separated by focus changes)

**Alternatives Considered**:
- Time-based debouncing (500ms): Would incorrectly merge actions if user returns to same element later
- No rollup: Would create thousands of events for typing, violating FR-033
- All events in element: Would merge too aggressively (e.g., type, blur, type again)

### 5. Storage Strategy

**Decision**: Use chrome.storage.local for session data and settings, with periodic sync to minimize data loss

**Rationale**:
- chrome.storage.local provides 10MB+ quota (QUOTA_BYTES: unlimited in practice)
- Automatic sync across browser crashes (better than in-memory)
- Supports constitutional priority: Data Persistence > Performance
- Settings in same storage API ensure persistence across sessions (FR-032)
- Periodic saves during recording reduce data loss risk

**Alternatives Considered**:
- In-memory only: Would lose data on tab close (violates FR per edge case decision)
- IndexedDB: Overkill for this data structure, harder to debug
- chrome.storage.sync: 100KB limit too restrictive for recording sessions

### 6. Annotation Interface Design

**Decision**: Modal overlay with auto-focused inputs and keyboard navigation (Enter to accept, Tab+Enter to reject/save)

**Rationale**:
- FR-016, FR-034, FR-035, FR-036 specify keyboard-driven workflow
- Auto-focus enables rapid keyboard-only interaction (workflow integration principle)
- Modal overlay ensures visibility without being permanently intrusive
- Position near interaction point for visual context
- Escape key to dismiss and reject event

**Alternatives Considered**:
- Sidebar annotation: Would require mouse movement, disrupting workflow
- Keyboard shortcuts only: More complex to discover and remember
- Toast notifications: Less interactive, harder to annotate

### 7. JSON Export Format

**Decision**: Nested structure with top-level summary fields and details objects

**Rationale**:
- FR-025 requires readable top-level with nested details
- FR-014 specifies property order: annotation, type, title, URL, elementDetails
- ElementDetails object contains: html, selector, domContext (nested)
- Timestamp formatting: ISO 8601 for machine parsing
- Session metadata at root level
- Supports FR-028, FR-029, FR-030 (POM generation, test design, summaries)

**Example Structure**:
```json
{
  "sessionId": "uuid",
  "startTime": "2025-10-02T14:30:00.000Z",
  "endTime": "2025-10-02T14:35:00.000Z",
  "events": [
    {
      "annotation": "User entered login credentials",
      "interactionType": "keypress",
      "pageTitle": "Login Page",
      "url": "https://example.com/login",
      "elementDetails": {
        "html": "<input id='username' type='text'>",
        "selector": "#username",
        "domContext": {
          "parents": ["form.login-form", "div.container"],
          "siblings": { "prev": "<label>", "next": "<input type='password'>" }
        }
      },
      "textInput": "john.doe@example.com",
      "timestamp": "2025-10-02T14:30:15.000Z"
    }
  ]
}
```

**Alternatives Considered**:
- Flat structure: Would duplicate page info, harder to collapse in editors
- Separate files per page: Harder to analyze full user flow
- XML format: Less familiar to developers, more verbose

### 8. Settings Interface and Persistence

**Decision**: Chrome extension options page with checkboxes for event types, persisted in chrome.storage.local

**Rationale**:
- FR-031, FR-032, FR-038 require customizable event types with persistence
- Options page is standard Chrome extension pattern
- Checkboxes for event types: click, keypress, hover, scroll, focus, blur, navigation
- Default: all enabled except hover (performance consideration)
- Settings accessible via popup "Settings" button
- Changes apply immediately to current session (FR-038)

**Alternatives Considered**:
- In-popup settings: Would clutter recording controls
- Context menu only: Less discoverable
- Per-session settings: Would require reconfiguration too frequently (violates FR-032)

## Technology Stack Summary

**Core Technologies**:
- Chrome Extension Manifest V3
- Vanilla JavaScript (ES6+) or TypeScript if complexity warrants
- Chrome APIs: storage.local, runtime, tabs, scripting, sidePanel, downloads

**No External Dependencies**:
- Aligns with local-first constitutional principle
- Reduces maintenance burden
- Improves load performance

**Development Approach**:
- Start with vanilla JavaScript
- Add TypeScript only if type safety becomes critical
- No build step initially (constitutional YAGNI principle)
- Add bundling only if module complexity requires it

## Performance Considerations

**Event Capture**:
- Use passive event listeners where possible
- Debounce rapid events (constitutional requirement)
- Limit DOM traversal depth
- Avoid synchronous storage writes during capture

**Memory Management**:
- Periodic cleanup of old sessions from storage
- Warning threshold: 5MB of session data (FR edge case answer)
- Automatic storage of session during recording (data persistence priority)

**UI Rendering**:
- Virtual scrolling for log view if >1000 events
- Lazy loading of DOM context details
- CSS containment for annotation overlays

## Security & Privacy

**No Network Access**:
- All data stays local (constitutional requirement)
- No analytics, no telemetry
- manifest.json: no host permissions for external domains

**Content Script Isolation**:
- Don't track extension's own UI (FR-014 edge case)
- Exclude tracking for chrome:// and chrome-extension:// URLs
- Detect overlay elements by class/data attributes

**Data Retention**:
- User controls all data (manual export)
- Clear data option in settings
- No automatic uploads or sharing

## Open Questions Resolved

None - all technical unknowns from spec resolved through research.

## Next Steps

Proceed to Phase 1:
1. Define data models (RecordingSession, InteractionEvent, etc.)
2. Design storage service contracts
3. Design export service contracts
4. Create quickstart guide for manual testing
