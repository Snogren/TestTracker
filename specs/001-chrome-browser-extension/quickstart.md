# Quickstart Guide: Chrome Interaction Recorder Extension

**Purpose**: Manual testing guide for validating all functional requirements  
**Audience**: Developers and testers  
**Duration**: ~30 minutes for complete validation

---

## Prerequisites

1. **Chrome Browser**: Version 114+ (for sidepanel API support)
2. **Extension Installed**: Load unpacked extension from `src/` directory
3. **Test Website**: Any website (suggest using https://example.com for consistency)
4. **File Access**: Ability to save and open JSON files

---

## Quick Validation (5 minutes)

Rapid smoke test to verify core functionality.

### 1. Start Recording

**Steps**:
1. Click extension icon in toolbar
2. Click "Record" button
3. Verify recording indicator shows (red dot or "Recording" label)

**Expected**: Recording state visible, session created

**FR**: FR-001, FR-005

---

### 2. Capture Interaction

**Steps**:
1. Navigate to https://example.com
2. Click on any link
3. Accept/reject popup appears
4. Press Enter to accept
5. Type annotation (or skip)
6. Tab to Save, press Enter

**Expected**: Event captured with annotation, visible in logs

**FR**: FR-006, FR-007, FR-008, FR-009, FR-010, FR-015, FR-016

---

### 3. View Logs

**Steps**:
1. Click "View Logs" button (opens sidepanel)
2. Verify event appears in log list

**Expected**: Event displayed with type, title, annotation

**FR**: FR-020, FR-021, FR-022, FR-023

---

### 4. Stop and Export

**Steps**:
1. Click "Stop" button in popup
2. File save dialog appears
3. Save file to Downloads folder
4. Open JSON file in text editor

**Expected**: JSON file with proper structure, readable top level

**FR**: FR-004, FR-024, FR-025, FR-027, FR-037

---

## Complete Validation (30 minutes)

Comprehensive test of all functional requirements.

### Test Suite 1: Recording Controls (5 min)

#### Test 1.1: Record Button (FR-001)

**Steps**:
1. Open extension popup
2. Verify "Record" button is visible and enabled
3. Click "Record" button
4. Verify button changes to "Pause" and "Stop"
5. Verify recording indicator appears

**Expected**: New session started, UI updated

**Validation**: Check chrome.storage.local for activeSession

---

#### Test 1.2: Pause Button (FR-002)

**Steps**:
1. Start recording
2. Click "Pause" button
3. Verify button changes to "Resume"
4. Click on page elements
5. Verify no events captured

**Expected**: Session status='paused', no new events

**Validation**: activeSession.status === 'paused'

---

#### Test 1.3: Resume Button (FR-003)

**Steps**:
1. While paused, click "Resume" button
2. Verify button changes back to "Pause"
3. Click on page element
4. Verify event captured

**Expected**: Session status='recording', events captured again

**Validation**: activeSession.status === 'recording', new events added

---

#### Test 1.4: Stop Button (FR-004)

**Steps**:
1. While recording/paused, click "Stop" button
2. Verify save file dialog appears
3. Save JSON file
4. Verify recording controls reset

**Expected**: Session ended, file downloaded

**Validation**: activeSession === null, file exists in Downloads

---

#### Test 1.5: Recording State Indicators (FR-005)

**Steps**:
1. Observe extension icon/popup during each state:
   - Before recording (idle)
   - While recording (active indicator)
   - While paused (paused indicator)
   - After stopped (idle again)

**Expected**: Clear visual distinction between states

**Validation**: Visual inspection, state reflected in UI

---

### Test Suite 2: Interaction Capture (10 min)

#### Test 2.1: User Annotation (FR-006)

**Steps**:
1. Start recording
2. Click page element
3. In annotation input, type: "Testing annotation feature"
4. Save annotation
5. View logs
6. Verify annotation appears with event

**Expected**: Annotation stored and displayed

**Validation**: event.annotation === "Testing annotation feature"

---

#### Test 2.2: Interaction Type (FR-007)

**Steps**:
1. Perform different interactions:
   - Click a button
   - Type in a text field
   - Hover over an element (if enabled)
   - Scroll the page (if enabled)
2. View logs
3. Verify each event shows correct type

**Expected**: 'click', 'keypress', 'hover', 'scroll' captured

**Validation**: event.interactionType matches action

---

#### Test 2.3: Page Title (FR-008)

**Steps**:
1. Navigate to page with title "Example Domain"
2. Perform interaction
3. Export JSON
4. Open file and find event
5. Verify pageTitle field

**Expected**: pageTitle === "Example Domain"

**Validation**: event.pageTitle correct in JSON

---

#### Test 2.4: URL Capture (FR-009)

**Steps**:
1. Navigate to https://example.com/page
2. Perform interaction
3. Export JSON
4. Verify url field

**Expected**: url === "https://example.com/page"

**Validation**: event.url correct in JSON

---

#### Test 2.5: Element Details (FR-010)

**Steps**:
1. Click on a button with id="submit"
2. Export JSON
3. Examine elementDetails object
4. Verify fields: html, selector, tagName, id, classes, textContent

**Expected**: All fields present with correct values

**Validation**: 
- elementDetails.html contains <button
- elementDetails.id === "submit"
- elementDetails.tagName === "BUTTON"

---

#### Test 2.6: DOM Context (FR-011)

**Steps**:
1. Click nested element (e.g., button inside form inside div)
2. Export JSON
3. Examine elementDetails.domContext
4. Verify parents array has multiple entries
5. Verify siblings object has previous/next

**Expected**: Parent chain captured, siblings present

**Validation**:
- domContext.parents.length > 0
- domContext.parents includes form and div
- domContext.siblings has previous or next (if applicable)

---

#### Test 2.7: Regular Text Keypresses (FR-012)

**Steps**:
1. Click in text input field
2. Type: "hello world"
3. Accept event
4. View event details
5. Verify textInput field

**Expected**: textInput === "hello world"

**Validation**: event.textInput contains full text, eventCount > 1

---

#### Test 2.8: Special Keys (FR-013)

**Steps**:
1. Click in text input field
2. Type: "test" then press ENTER
3. Accept event
4. Type: "another" then press TAB
5. Accept event
6. Type: "text" then press BACKSPACE three times
7. Accept events
8. View event details

**Expected**: Special keys captured with labels (ENTER, TAB, BACKSPACE)

**Validation**: textInput includes key labels, not just regular text

---

#### Test 2.9: Event Rollup (FR-033)

**Steps**:
1. Click same button 5 times rapidly (consecutively, no other interactions)
2. Accept event
3. View logs
4. Verify only ONE event with eventCount=5

**Expected**: Consecutive clicks rolled into single event

**Validation**: 
- Only 1 event in logs for those clicks
- event.eventCount === 5

**Steps** (keypresses):
1. Click in text field
2. Type "hello" (5 characters, consecutive)
3. Accept event
4. View logs
5. Verify ONE event with textInput="hello"

**Expected**: All consecutive keypresses rolled into single event

**Validation**:
- Only 1 event for that text entry
- event.textInput === "hello"
- event.eventCount === 5

**Steps** (break sequence):
1. Click button (accept)
2. Click another element (breaks context)
3. Click first button again (accept)
4. View logs
5. Verify TWO separate events for the button

**Expected**: Context break prevents rollup

**Validation**:
- 2 events for same button
- Each has eventCount === 1

**Steps** (focus break):
1. Type "hello" in field #1
2. Press Tab (focus change)
3. Type "world" in field #2
4. Press Tab back to field #1
5. Type "again" in field #1
6. Accept all events
7. Verify THREE separate keypress events

**Expected**: Focus changes break rollup sequence

**Validation**:
- Event 1: textInput === "hello"
- Event 2: textInput === "world"  
- Event 3: textInput === "again"

---

### Test Suite 3: Event Management (5 min)

#### Test 3.1: Accept/Reject Popup (FR-015)

**Steps**:
1. Trigger interaction
2. Verify popup appears near interaction point
3. Verify two buttons: Accept and Reject
4. Verify auto-focus on Accept

**Expected**: Popup visible, Accept focused

**Validation**: Visual inspection, Enter key activates Accept

---

#### Test 3.2: Accept Button Auto-Focus (FR-016)

**Steps**:
1. Trigger interaction
2. Immediately press Enter (without clicking)
3. Verify event accepted (annotation popup appears)

**Expected**: Enter key accepts without mouse

**Validation**: Annotation popup shown

---

#### Test 3.3: Reject Button Accessibility (FR-034)

**Steps**:
1. Trigger interaction
2. Press Tab (moves to Reject button)
3. Press Enter
4. Verify event not captured

**Expected**: Tab → Enter rejects event

**Validation**: Event not in logs, no annotation popup

---

#### Test 3.4: Accepting Event Shows Annotation Popup (FR-035)

**Steps**:
1. Trigger interaction
2. Accept event
3. Verify annotation popup appears
4. Verify text input field and Save button present

**Expected**: Annotation popup shown with input

**Validation**: Visual inspection

---

#### Test 3.5: Annotation Input Auto-Focus (FR-036)

**Steps**:
1. Accept event
2. Immediately start typing (without clicking input)
3. Verify text appears in input field
4. Press Tab
5. Verify focus moves to Save button
6. Press Enter
7. Verify popup closes and annotation saved

**Expected**: Keyboard-only annotation workflow

**Validation**: 
- Typing works immediately
- Tab → Enter saves annotation
- event.annotation contains typed text

---

#### Test 3.6: Event Type Customization (FR-017)

**Steps**:
1. Open extension settings
2. Disable "click" events
3. Start recording
4. Click page elements
5. Verify no events captured
6. Re-enable "click" events
7. Click page elements
8. Verify events captured

**Expected**: Settings control event capture

**Validation**: 
- With click disabled: no events
- With click enabled: events captured

---

#### Test 3.7: Event Rejection (FR-018)

**Steps**:
1. Trigger 5 interactions
2. Reject 2 of them
3. Accept 3 of them
4. View logs
5. Verify only 3 events present

**Expected**: Rejected events not in logs

**Validation**: Log count === 3

---

#### Test 3.8: Event Acceptance (FR-019)

**Steps**:
1. Trigger interaction
2. Accept event
3. Annotate: "Accepted event"
4. View logs
5. Verify event present with annotation

**Expected**: Accepted event in logs with annotation

**Validation**: 
- Event in logs
- event.annotation === "Accepted event"

---

### Test Suite 4: Log Viewing (3 min)

#### Test 4.1: Log Interface (FR-020)

**Steps**:
1. Click "View Logs" in popup
2. Verify sidepanel opens
3. Verify log entries are visible

**Expected**: Sidepanel with log list

**Validation**: Visual inspection

---

#### Test 4.2: Chronological Order (FR-021)

**Steps**:
1. Perform 5 interactions with different timestamps
2. View logs
3. Verify events listed oldest to newest (or newest to oldest)

**Expected**: Consistent chronological order

**Validation**: Visual inspection of timestamps

---

#### Test 4.3: Log Display Fields (FR-022)

**Steps**:
1. View logs
2. For each event, verify visible:
   - Interaction type
   - Page title
   - Text input (if applicable)
   - User annotation

**Expected**: All specified fields displayed

**Validation**: Visual inspection

---

#### Test 4.4: View Logs While Recording (FR-023)

**Steps**:
1. Start recording
2. Perform interaction
3. Open log view
4. Verify event appears
5. Keep log view open
6. Perform another interaction
7. Verify new event appears in real-time

**Expected**: Logs update during active recording

**Validation**: Real-time updates visible

---

### Test Suite 5: JSON Output (5 min)

#### Test 5.1: JSON Generation (FR-024)

**Steps**:
1. Record session with 3+ events
2. Stop recording
3. Save JSON file
4. Open file in text editor
5. Verify valid JSON syntax (use jsonlint.com if needed)

**Expected**: Valid, parseable JSON

**Validation**: JSON.parse(fileContent) succeeds

---

#### Test 5.2: Nested Structure (FR-025, FR-026)

**Steps**:
1. Open exported JSON
2. Verify top level has: sessionId, startTime, endTime, events
3. Verify events array is readable
4. Verify each event has: annotation, interactionType, pageTitle, url at top level
5. Verify elementDetails is nested object
6. Verify domContext is nested within elementDetails
7. Collapse elementDetails in editor
8. Verify top level remains readable

**Expected**: High-level info readable, details collapsible

**Validation**:
- Top level fields not excessive
- elementDetails contains detailed fields
- domContext nested within elementDetails

---

#### Test 5.3: File Download (FR-027)

**Steps**:
1. Stop recording
2. Verify browser's native save dialog appears
3. Edit filename if desired
4. Choose save location
5. Click Save
6. Verify file appears in chosen location

**Expected**: Standard browser download flow

**Validation**: File saved to chosen location with chosen name

---

#### Test 5.4: Default Filename (FR-037)

**Steps**:
1. Stop recording
2. Observe default filename in save dialog
3. Verify format: dom-tracker-YYYYMMDD-HHMMSS.json

**Expected**: Filename includes timestamp to seconds

**Validation**: 
- Pattern matches dom-tracker-20251002-143045.json
- Timestamp reflects session start time

---

#### Test 5.5: Page Object Model Support (FR-028)

**Steps**:
1. Perform interactions with form elements (input, button, select)
2. Export JSON
3. Manually extract selectors and create POM structure
4. Verify sufficient data:
   - Element selectors (CSS, XPath)
   - Element identifiers (id, classes)
   - Element type (tag, attributes)

**Expected**: Can manually create POM from JSON

**Example POM**:
```javascript
class LoginPage {
  get usernameInput() { return $('#username'); }
  get passwordInput() { return $('#password'); }
  get loginButton() { return $('button[type="submit"]'); }
}
```

**Validation**: All necessary locators and context present

---

#### Test 5.6: Test Case Design Support (FR-029)

**Steps**:
1. Perform a user flow (e.g., login process)
2. Annotate each step clearly
3. Export JSON
4. Manually write test case from events
5. Verify sufficient data:
   - User actions (interactionType)
   - Test steps (annotation)
   - Assertions (pageTitle, url)
   - Test data (textInput)

**Expected**: Can manually create test case from JSON

**Example Test Case**:
```gherkin
Scenario: User Login
  Given I navigate to "https://example.com/login"
  When I enter "user@example.com" in the username field
  And I enter "password123" in the password field
  And I click the login button
  Then I should see the page title "Dashboard"
  And the URL should be "https://example.com/dashboard"
```

**Validation**: All test steps extractable from JSON

---

#### Test 5.7: Action Summary Support (FR-030)

**Steps**:
1. Perform multi-step flow with annotations
2. Export JSON
3. Create high-level summary from events
4. Verify sufficient data:
   - Action descriptions (annotation)
   - Page context (pageTitle, url)
   - Interaction flow (chronological events)

**Expected**: Can manually create summary from JSON

**Example Summary**:
```
Session Summary (5 min, 12 events):
1. Navigated to login page
2. Entered credentials (username: user@example.com)
3. Submitted login form
4. Accessed dashboard
5. Clicked "New Project" button
6. Filled project form
7. Saved new project
Result: Successfully created project "Test Project"
```

**Validation**: Summary captures user flow clearly

---

#### Test 5.8: Property Order (FR-014)

**Steps**:
1. Export JSON
2. Open in text editor
3. For each event, verify property order:
   1. annotation
   2. interactionType
   3. pageTitle
   4. url
   5. elementDetails
   6. timestamp
   7. textInput (if present)
   8. eventCount (if present)

**Expected**: Properties in exact order specified

**Validation**: Manual inspection of JSON structure

---

### Test Suite 6: Configuration (2 min)

#### Test 6.1: Settings Interface (FR-031)

**Steps**:
1. Right-click extension icon → Options
2. Verify settings page opens
3. Verify checkboxes for event types:
   - click
   - dblclick
   - keypress
   - hover
   - scroll
   - focus
   - blur
   - navigation

**Expected**: Settings interface with all event types

**Validation**: Visual inspection

---

#### Test 6.2: Settings Persistence (FR-032)

**Steps**:
1. Open settings
2. Disable "hover" events
3. Close browser completely
4. Reopen browser
5. Open settings again
6. Verify "hover" still disabled

**Expected**: Settings persist across sessions

**Validation**: chrome.storage.local maintains config

---

#### Test 6.3: Settings Apply During Recording (FR-038)

**Steps**:
1. Start recording
2. Perform click interaction (verify captured)
3. Open settings (keep recording active)
4. Disable "click" events
5. Save settings
6. Perform another click interaction
7. Verify NOT captured
8. Enable "click" again
9. Perform click interaction
10. Verify captured

**Expected**: Settings changes apply immediately to active session

**Validation**: Events captured/ignored based on live settings

---

## Edge Cases

Additional scenarios from spec edge cases.

### EC-1: Dynamic Content (AJAX/SPA)

**Steps**:
1. Navigate to SPA (e.g., Gmail, React app)
2. Perform interactions with dynamically loaded content
3. Verify events captured normally

**Expected**: Dynamic content tracked like static

**Validation**: Events captured regardless of load method

---

### EC-2: Rapid Interactions

**Steps**:
1. Type very fast in text field (100+ chars in 3 seconds, consecutively)
2. Accept event
3. Verify single event with all text

**Expected**: All consecutive keystrokes rolled into one event

**Validation**: event.textInput contains full text (100+ chars)

---

### EC-3: Page Navigation

**Steps**:
1. Start recording
2. Click link that navigates to new page
3. Verify navigation event captured
4. Perform interaction on new page
5. Verify new interaction captured

**Expected**: Recording continues across pages

**Validation**: Events from both pages in session

---

### EC-4: Iframe Interactions

**Steps**:
1. Navigate to page with iframe
2. Click element inside iframe
3. Accept event
4. View logs
5. Verify event captured

**Expected**: Iframe interactions recorded

**Validation**: Event in logs with correct element details

---

### EC-5: Shadow DOM Elements

**Steps**:
1. Navigate to page with shadow DOM components
2. Interact with shadow DOM element
3. Accept event
4. Verify event captured

**Expected**: Shadow DOM interactions recorded

**Validation**: Event in logs

---

### EC-6: Browser Tab Close

**Steps**:
1. Start recording
2. Perform interactions
3. Close browser tab WITHOUT stopping
4. Reopen extension
5. Check for active session

**Expected**: Recording lost (per edge case decision)

**Validation**: No active session, data not recovered

---

### EC-7: Long Recording Session

**Steps**:
1. Start recording
2. Perform 1000+ interactions (use automated script if needed)
3. Monitor browser performance
4. At ~5000 events, verify warning appears
5. Continue to 10000 events
6. Stop recording
7. Verify export completes

**Expected**: 
- Warning at 5000 events
- No significant performance degradation
- Export succeeds

**Validation**: 
- Warning message shown
- Page remains responsive
- JSON file generated

---

### EC-8: Extension UI Interactions

**Steps**:
1. Start recording
2. Click extension popup buttons
3. Open sidepanel
4. Click within sidepanel
5. View logs
6. Verify NO events for extension UI

**Expected**: Extension UI not tracked

**Validation**: No events with extension URLs/elements

---

### EC-9: Keyboard Shortcuts with Focus

**Steps**:
1. Start recording
2. Click in text field (has focus)
3. Press Ctrl+A (select all)
4. Verify captured
5. Click outside field (no focus)
6. Press Ctrl+A
7. Verify NOT captured (per edge case decision)

**Expected**: Only keypresses in focused elements captured

**Validation**: 
- Focused: event captured
- Unfocused: no event

---

## Success Criteria

All functional requirements (FR-001 through FR-038) validated.

### Mandatory Validations:
- [x] Recording controls work (FR-001 to FR-005)
- [x] Interaction capture complete (FR-006 to FR-014, FR-033)
- [x] Event management functional (FR-015 to FR-019, FR-034 to FR-036)
- [x] Log viewing works (FR-020 to FR-023)
- [x] JSON export correct (FR-024 to FR-030, FR-037, FR-014)
- [x] Configuration persists (FR-031, FR-032, FR-038)

### All Edge Cases Handled:
- [x] Dynamic content (EC-1)
- [x] Rapid interactions (EC-2)
- [x] Page navigation (EC-3)
- [x] Iframes (EC-4)
- [x] Shadow DOM (EC-5)
- [x] Tab close (EC-6)
- [x] Long sessions (EC-7)
- [x] Extension UI (EC-8)
- [x] Keyboard with focus (EC-9)

---

## Troubleshooting

### Issue: Events not capturing

**Check**:
1. Is recording active? (check status indicator)
2. Is event type enabled in settings?
3. Is element part of extension UI?
4. Check browser console for errors

---

### Issue: Annotation popup not appearing

**Check**:
1. Is popup blocked by page CSS?
2. Check z-index on annotation overlay
3. Verify content script loaded (check page source)

---

### Issue: JSON export fails

**Check**:
1. Is session stopped?
2. Check browser console for errors
3. Verify downloads permission in manifest
4. Try exporting with fewer events (test)

---

### Issue: Settings not persisting

**Check**:
1. Verify chrome.storage.local permission
2. Check browser console for storage errors
3. Try clearing extension data and reconfiguring

---

## Performance Benchmarks

Expected performance targets:

- **Event Capture Latency**: <50ms from user action to storage
- **Annotation Response**: <100ms to show popup after event
- **Log View Update**: <200ms to refresh after new event
- **Export Time**: <2s for 1000 events
- **Storage Usage**: ~1KB per event (varies by DOM complexity)
- **Page Performance**: No measurable FPS drop (<5% CPU overhead)

---

## Next Steps

After successful quickstart validation:

1. Review tasks.md for implementation order
2. Begin with Phase 4 (implementation tasks)
3. Perform quickstart validation after each major component
4. Update this guide if new edge cases discovered
5. Document any deviations from expected behavior

---

**Last Updated**: 2025-10-02  
**Version**: 1.0  
**Status**: Ready for manual testing
