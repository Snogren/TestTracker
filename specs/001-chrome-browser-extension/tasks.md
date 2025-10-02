# Tasks: Chrome Interaction Recorder Extension

**Input**: Design documents from `/specs/001-chrome-browser-extension/`
**Prerequisites**: plan.md, research.md, data-model.md, contracts/, quickstart.md

## Execution Flow (main)
```
1. ✅ Loaded plan.md - Tech: JavaScript/TypeScript, Manifest V3, Chrome APIs
2. ✅ Loaded data-model.md - Entities: RecordingSession, InteractionEvent, ElementDetails, DOMContext, EventConfiguration
3. ✅ Loaded contracts/ - Services: StorageService, ExportService, EventProcessorService
4. ✅ Loaded quickstart.md - 6 test suites with 38 functional tests + 9 edge cases
5. ✅ Generated tasks by category: Setup, Models, Services, Scripts, UI, Integration, Testing
6. ✅ Applied task rules: [P] for parallel, TDD order, dependency chains
7. ✅ Numbered tasks sequentially (T001-T052)
8. ✅ Created dependency graph and parallel execution examples
9. ✅ Validated: All entities modeled, all services contracted, all tests mapped
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions
- Manual testing only (per constitution)

## Phase 3.1: Foundation & Setup

- [x] **T001** Create project directory structure per plan.md
  - **Files**: Create `src/`, `src/background/`, `src/content/`, `src/ui/`, `src/models/`, `src/services/`, `src/lib/`, `tests/manual/`
  - **Output**: Complete directory tree from plan.md Project Structure section

- [x] **T002** Create manifest.json with Manifest V3 configuration
  - **File**: `src/manifest.json`
  - **Include**: Required permissions (storage, downloads, scripting, tabs, activeTab), content_scripts, background service_worker, side_panel, action popup
  - **Reference**: research.md Section 1 (Manifest V3 Architecture)

- [x] **T003** [P] Create data model type definitions
  - **File**: `src/models/types.js` (or `.ts` if using TypeScript)
  - **Include**: EventType enum, SessionStatus enum, JSDoc type definitions for all entities from data-model.md
  - **Reference**: data-model.md Enums section

## Phase 3.2: Data Models (Parallel)

- [x] **T004** [P] Create RecordingSession model
  - **File**: `src/models/recording-session.js`
  - **Include**: Constructor, validation rules, state transition methods (toRecording, toPaused, toStopped)
  - **Reference**: data-model.md RecordingSession entity

- [x] **T005** [P] Create InteractionEvent model
  - **File**: `src/models/interaction-event.js`
  - **Include**: Constructor, validation rules, property order enforcement (FR-014)
  - **Reference**: data-model.md InteractionEvent entity

- [x] **T006** [P] Create ElementDetails model
  - **File**: `src/models/element-details.js`
  - **Include**: Constructor, validation rules, nested DOMContext
  - **Reference**: data-model.md ElementDetails entity

- [x] **T007** [P] Create EventConfiguration model
  - **File**: `src/models/event-config.js`
  - **Include**: Constructor, default values, validation rules
  - **Reference**: data-model.md EventConfiguration entity

- [x] **T008** [P] Create error type classes
  - **File**: `src/models/errors.js`
  - **Include**: StorageError, SessionNotFoundError, ValidationError, ExportError, etc.
  - **Reference**: contracts/storage-service.md Error Types section

## Phase 3.3: Service Layer (Parallel)

- [x] **T009** [P] Implement StorageService - Session Management
  - **File**: `src/services/storage-service.js`
  - **Include**: createSession(), getActiveSession(), updateSession(), stopSession(), getSession(), listSessions(), deleteSession()
  - **Reference**: contracts/storage-service.md Session Management section

- [x] **T010** [P] Implement StorageService - Event Management
  - **File**: `src/services/storage-service.js` (same file, depends on T009)
  - **Include**: addEvent(), getEvents()
  - **Reference**: contracts/storage-service.md Event Management section

- [x] **T011** [P] Implement StorageService - Configuration Management
  - **File**: `src/services/storage-service.js` (same file, depends on T009)
  - **Include**: getConfig(), updateConfig(), resetConfig()
  - **Reference**: contracts/storage-service.md Configuration Management section

- [x] **T012** [P] Implement StorageService - Storage Management
  - **File**: `src/services/storage-service.js` (same file, depends on T009)
  - **Include**: getStorageStats(), cleanup(), clearAllData()
  - **Reference**: contracts/storage-service.md Storage Management section

- [x] **T013** [P] Implement ExportService
  - **File**: `src/services/export-service.js`
  - **Include**: exportSession(), generateJSON(), downloadJSON(), formatFilename(), validateJSONStructure()
  - **Reference**: contracts/export-service.md, data-model.md Export Format section

- [x] **T014** [P] Implement EventProcessorService - Core Processing
  - **File**: `src/services/event-processor.js`
  - **Include**: processEvent(), rollupEvent() with consecutive tracking logic
  - **Reference**: contracts/event-processor-service.md Event Processing section

- [x] **T015** [P] Implement EventProcessorService - Filtering
  - **File**: `src/services/event-processor.js` (same file, depends on T014)
  - **Include**: isEventEnabled(), shouldIgnoreElement()
  - **Reference**: contracts/event-processor-service.md Filtering section

- [x] **T016** [P] Implement EventProcessorService - DOM Utilities
  - **File**: `src/services/event-processor.js` (same file, depends on T014)
  - **Include**: extractElementDetails(), extractDOMContext(), generateSelector(), generateXPath()
  - **Reference**: contracts/event-processor-service.md Utilities section

## Phase 3.4: Background Script

- [x] **T017** Create service worker initialization
  - **File**: `src/background/service-worker.js`
  - **Include**: Initialize StorageService, ExportService, EventProcessorService on install
  - **Dependencies**: T009-T016 (all services must exist)

- [x] **T018** Implement background message handlers
  - **File**: `src/background/service-worker.js` (same file, depends on T017)
  - **Include**: chrome.runtime.onMessage handlers for session control, event storage, export requests
  - **Reference**: research.md Section 1 (service worker coordination)

- [x] **T019** Implement session lifecycle coordination
  - **File**: `src/background/service-worker.js` (same file, depends on T017)
  - **Include**: Coordinate between content scripts and UI, manage recording state
  - **Reference**: data-model.md Recording Lifecycle section

## Phase 3.5: Content Scripts (Some Parallel)

- [x] **T020** [P] Create tracker.js event listener setup
  - **File**: `src/content/tracker.js`
  - **Include**: Event listeners for click, dblclick, keypress, hover, scroll, focus, blur, navigation with capture phase
  - **Reference**: research.md Section 2 (Event Capture Strategy)

- [x] **T021** [P] Create dom-capture.js utilities
  - **File**: `src/content/tracker.js` (integrated into tracker.js)
  - **Include**: DOM traversal, parent extraction, sibling capture, HTML sanitization
  - **Reference**: research.md Section 3 (DOM Context Extraction)

- [x] **T022** Implement consecutive event rollup tracking
  - **File**: `src/content/tracker.js` (same file, depends on T020)
  - **Include**: Track lastAcceptedEvent, contextBroken state, detect break events (blur, focus, element change, type change)
  - **Reference**: contracts/event-processor-service.md Event Rollup Algorithm section

- [x] **T023** Implement event capture for each type
  - **File**: `src/content/tracker.js` (same file, depends on T020)
  - **Include**: Separate handlers for click, keypress (with special keys), scroll, navigation, etc.
  - **Reference**: spec.md FR-007, FR-012, FR-013

- [x] **T024** Implement element ignore logic
  - **File**: `src/content/tracker.js` (same file, depends on T020)
  - **Include**: Check for extension UI elements, chrome:// URLs, data attributes
  - **Reference**: contracts/event-processor-service.md shouldIgnoreElement(), spec.md edge case

- [x] **T025** [P] Create annotation overlay UI
  - **File**: `src/content/tracker.js` (integrated into tracker.js)
  - **Include**: Accept/reject popup with auto-focus, annotation input popup, keyboard navigation (Enter, Tab, Escape)
  - **Reference**: spec.md FR-015, FR-016, FR-034, FR-035, FR-036

- [x] **T026** [P] Create annotation overlay CSS
  - **File**: `src/ui/annotation/annotation.css`
  - **Include**: Modal styling, z-index management, positioning near interaction point, keyboard focus indicators
  - **Reference**: research.md Section 6 (Annotation Interface Design)

- [x] **T027** Implement annotation workflow integration
  - **File**: `src/content/tracker.js` (same file, depends on T020, T025)
  - **Include**: Show annotation UI on event, handle accept/reject, pass annotation to event processor
  - **Reference**: contracts/event-processor-service.md requestAnnotation()

- [x] **T028** Inject content script CSS
  - **File**: `src/content/tracker.js` (same file, depends on T020)
  - **Include**: Dynamically inject annotation.css, ensure proper load order
  - **Reference**: Manifest V3 best practices

## Phase 3.6: UI Components (Parallel)

- [x] **T029** [P] Create popup HTML structure
  - **File**: `src/ui/popup/popup.html`
  - **Include**: Record/Pause/Resume/Stop buttons, recording state indicator, Settings link, View Logs button
  - **Reference**: spec.md FR-001 through FR-005

- [x] **T030** [P] Create popup JavaScript logic
  - **File**: `src/ui/popup/popup.js`
  - **Include**: Button event handlers, message passing to background script, state updates
  - **Dependencies**: T017-T019 (background script must exist)

- [x] **T031** [P] Create popup CSS styling
  - **File**: `src/ui/popup/popup.css`
  - **Include**: Button styles, state indicators (recording/paused/stopped), responsive layout
  - **Reference**: research.md Section 5 (UI requirements)

- [x] **T032** [P] Create sidepanel HTML structure
  - **File**: `src/ui/sidepanel/sidepanel.html`
  - **Include**: Log list container, event detail view, filter/search controls (if needed)
  - **Reference**: spec.md FR-020, FR-021, FR-022

- [x] **T033** [P] Create sidepanel JavaScript logic
  - **File**: `src/ui/sidepanel/sidepanel.js`
  - **Include**: Load events from storage, display chronologically, real-time updates, pagination (if >100 events)
  - **Dependencies**: T009-T012 (StorageService must exist)
  - **Reference**: spec.md FR-023, data-model.md Performance Considerations

- [x] **T034** [P] Create sidepanel CSS styling
  - **File**: `src/ui/sidepanel/sidepanel.css`
  - **Include**: List styling, event cards, syntax highlighting for JSON, collapsible details
  - **Reference**: quickstart.md Test 4.3 (display fields)

- [x] **T035** [P] Create settings/options page HTML
  - **File**: `src/ui/options/options.html`
  - **Include**: Event type checkboxes (click, dblclick, keypress, hover, scroll, focus, blur, navigation), save/reset buttons
  - **Reference**: spec.md FR-031, FR-032

- [x] **T036** [P] Create settings page JavaScript logic
  - **File**: `src/ui/options/options.js`
  - **Include**: Load config, save config, reset to defaults, notify active recording of changes
  - **Dependencies**: T011 (Configuration management must exist)
  - **Reference**: spec.md FR-038 (apply during session)

- [x] **T037** [P] Create settings page CSS styling
  - **File**: `src/ui/options/options.css`
  - **Include**: Form styling, checkbox groups, button styles

## Phase 3.7: Utility Libraries (Parallel)

- [x] **T038** [P] Create DOM utilities
  - **File**: `src/services/event-processor.js` (integrated into EventProcessorService)
  - **Include**: CSS selector generation, XPath generation, element comparison, HTML sanitization
  - **Reference**: contracts/event-processor-service.md Utilities section

- [x] **T039** [P] Create keyboard utilities
  - **File**: `src/content/tracker.js` (integrated into content script)
  - **Include**: Special key detection (ENTER, TAB, BACKSPACE), key label mapping, keyboard shortcut handling
  - **Reference**: spec.md FR-013

## Phase 3.8: Integration & Wiring

- [x] **T040** Wire popup controls to background service
  - **Files**: `src/ui/popup/popup.js` (depends on T030), `src/background/service-worker.js` (depends on T018)
  - **Include**: Message passing for record/pause/resume/stop commands, state synchronization
  - **Reference**: spec.md FR-001 through FR-004

- [x] **T041** Connect content scripts to storage service
  - **Files**: `src/content/tracker.js` (depends on T027), `src/background/service-worker.js` (depends on T018)
  - **Include**: Send captured events to background for storage, receive config updates
  - **Reference**: data-model.md Data Flow section

- [x] **T042** Implement real-time log updates
  - **Files**: `src/ui/sidepanel/sidepanel.js` (depends on T033), `src/background/service-worker.js` (depends on T018)
  - **Include**: chrome.storage.onChanged listener, update UI when events added
  - **Reference**: spec.md FR-023

- [x] **T043** Wire export functionality
  - **Files**: `src/ui/popup/popup.js` (depends on T030), `src/background/service-worker.js` (depends on T018), `src/services/export-service.js` (depends on T013)
  - **Include**: Trigger export on stop, handle download errors, show success/failure feedback
  - **Reference**: spec.md FR-004, FR-027

- [x] **T044** Implement settings synchronization
  - **Files**: `src/ui/options/options.js` (depends on T036), `src/content/tracker.js` (depends on T020), `src/background/service-worker.js` (depends on T018)
  - **Include**: Broadcast config changes to all tabs, update event listeners in real-time
  - **Reference**: spec.md FR-038

- [x] **T045** Handle state synchronization across components
  - **Files**: `src/background/service-worker.js` (depends on T019)
  - **Include**: Ensure popup, sidepanel, and content scripts all reflect current session state
  - **Reference**: data-model.md State Transitions section

## Phase 3.9: Manual Testing (Sequential - Execute Quickstart)

- [ ] **T046** Execute quickstart.md Test Suite 1: Recording Controls
  - **Test**: Manual validation of FR-001 through FR-005 (Record, Pause, Resume, Stop, State Indicators)
  - **File**: Document results in `tests/manual/test-results.md`
  - **Reference**: quickstart.md Test Suite 1

- [ ] **T047** Execute quickstart.md Test Suite 2: Interaction Capture
  - **Test**: Manual validation of FR-006 through FR-013, FR-033 (Annotation, Types, Page Info, Element Details, DOM Context, Keypresses, Rollup)
  - **File**: Document results in `tests/manual/test-results.md`
  - **Reference**: quickstart.md Test Suite 2

- [ ] **T048** Execute quickstart.md Test Suite 3: Event Management
  - **Test**: Manual validation of FR-015 through FR-019, FR-034 through FR-036 (Accept/Reject UI, Annotation Popups, Keyboard Navigation)
  - **File**: Document results in `tests/manual/test-results.md`
  - **Reference**: quickstart.md Test Suite 3

- [ ] **T049** Execute quickstart.md Test Suite 4: Log Viewing
  - **Test**: Manual validation of FR-020 through FR-023 (Log Interface, Chronological Order, Display Fields, Real-time Updates)
  - **File**: Document results in `tests/manual/test-results.md`
  - **Reference**: quickstart.md Test Suite 4

- [ ] **T050** Execute quickstart.md Test Suite 5: JSON Output
  - **Test**: Manual validation of FR-024 through FR-030, FR-037, FR-014 (JSON Generation, Structure, Download, Filename, Use Case Support, Property Order)
  - **File**: Document results in `tests/manual/test-results.md`
  - **Reference**: quickstart.md Test Suite 5

- [ ] **T051** Execute quickstart.md Test Suite 6: Configuration
  - **Test**: Manual validation of FR-031, FR-032, FR-038 (Settings Interface, Persistence, Apply During Recording)
  - **File**: Document results in `tests/manual/test-results.md`
  - **Reference**: quickstart.md Test Suite 6

- [ ] **T052** Execute quickstart.md Edge Cases
  - **Test**: Manual validation of all 9 edge cases (Dynamic Content, Rapid Interactions, Page Navigation, Iframes, Shadow DOM, Tab Close, Long Sessions, Extension UI, Keyboard Focus)
  - **File**: Document results in `tests/manual/test-results.md`
  - **Reference**: quickstart.md Edge Cases section

## Dependencies

### Critical Path (Must Complete in Order)
```
T001 (structure) → T002 (manifest) → T003 (types)
  ↓
T004-T008 (models - parallel)
  ↓
T009-T016 (services - some parallel)
  ↓
T017-T019 (background script)
  ↓
T020-T028 (content scripts)
  ↓
T029-T039 (UI & utilities - parallel)
  ↓
T040-T045 (integration - sequential)
  ↓
T046-T052 (manual testing - sequential)
```

### Same-File Dependencies (Cannot Parallelize)
- **storage-service.js**: T009 → T010 → T011 → T012
- **event-processor.js**: T014 → T015 → T016
- **service-worker.js**: T017 → T018 → T019
- **tracker.js**: T020 → T022 → T023 → T024 → T027 → T028
- **popup.js**: T030 → T040 (integration)
- **sidepanel.js**: T033 → T042 (integration)

### Parallel Execution Opportunities
- **Models** (T004-T008): All can run in parallel
- **Services Start** (T009, T013, T014): All can start in parallel
- **UI Components** (T029-T037): All HTML/CSS/initial JS can run in parallel
- **Utilities** (T038-T039): Can run in parallel

## Parallel Execution Examples

### Phase 1: Models (All Parallel)
```bash
# Launch all model creation tasks together:
# T004: RecordingSession model
# T005: InteractionEvent model
# T006: ElementDetails model
# T007: EventConfiguration model
# T008: Error types
```

### Phase 2: Services Initial Implementation (Parallel Start)
```bash
# Launch service foundations together:
# T009: StorageService - Session Management
# T013: ExportService
# T014: EventProcessorService - Core Processing
# Then sequentially complete same-file tasks (T010-T012, T015-T016)
```

### Phase 3: UI Components (All Parallel)
```bash
# Launch all UI creation tasks together:
# T029: popup.html
# T030: popup.js
# T031: popup.css
# T032: sidepanel.html
# T033: sidepanel.js
# T034: sidepanel.css
# T035: options.html
# T036: options.js
# T037: options.css
# T038: dom-utils.js
# T039: keyboard-utils.js
```

## Validation Checklist

- [x] All entities from data-model.md have model tasks (T004-T007)
- [x] All services from contracts/ have implementation tasks (T009-T016)
- [x] All functional requirements mapped to tasks
- [x] All quickstart test suites have manual test tasks (T046-T052)
- [x] Each task specifies exact file path
- [x] Parallel tasks [P] marked correctly (different files, no dependencies)
- [x] No [P] tasks modify the same file
- [x] Integration tasks come after core implementation
- [x] Manual testing comes after integration

## Notes

### Constitution Compliance
- ✅ **Manual Testing Only**: No automated test suite, all testing via quickstart.md (T046-T052)
- ✅ **Modular Monolith**: Clear separation of concerns in task organization
- ✅ **Local-First**: No external dependencies in any task
- ✅ **Spec-Driven**: All tasks derived from design documents

### Implementation Guidelines
- **Commit after each task**: Keep changes atomic and traceable
- **Avoid vague tasks**: Each task has specific file path and clear deliverable
- **Test incrementally**: Can test components manually as you build (see quickstart.md)
- **Handle same-file conflicts**: Sequential tasks on same file cannot be parallelized

### Performance Targets (from research.md)
- Event Capture Latency: <50ms
- Annotation Response: <100ms
- Log View Update: <200ms
- Export Time: <2s for 1000 events
- Page Performance: No measurable FPS drop

### Storage Limits (from data-model.md)
- Warning threshold: 5MB of session data
- Automatic cleanup triggered at threshold
- Active session always preserved

---

**Total Tasks**: 52  
**Completed**: 45 (T001-T045) ✅  
**Remaining**: 7 (T046-T052 - Manual Testing) 📋  
**Status**: Core Implementation Complete - Ready for Testing  
**Last Updated**: 2025-10-02

---

## Implementation Complete! 🎉

The core extension is fully implemented and ready for manual testing. All code components (T001-T045) are complete:

- ✅ Foundation & Setup (3 tasks)
- ✅ Data Models (5 tasks)
- ✅ Service Layer (8 tasks)
- ✅ Background Script (3 tasks)
- ✅ Content Scripts (9 tasks)
- ✅ UI Components (9 tasks)
- ✅ Utility Libraries (2 tasks)
- ✅ Integration & Wiring (6 tasks)

**Next Phase**: Execute manual testing per quickstart.md (T046-T052)
