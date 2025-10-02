
# Implementation Plan: Chrome Interaction Recorder Extension

**Branch**: `001-chrome-browser-extension` | **Date**: 2025-10-02 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-chrome-browser-extension/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from file system structure or context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Fill the Constitution Check section based on the content of the constitution document.
4. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file (e.g., `CLAUDE.md` for Claude Code, `.github/copilot-instructions.md` for GitHub Copilot, `GEMINI.md` for Gemini CLI, `QWEN.md` for Qwen Code or `AGENTS.md` for opencode).
7. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary
A Chrome browser extension that records user interactions with websites, providing controls (record, pause, resume, stop), an annotation system for events, customizable event capture, and JSON export. The extension captures interaction type, page context, element details, and DOM context to support test automation artifact generation, user flow documentation, and usability analysis.

## Technical Context
**Language/Version**: JavaScript/TypeScript (Chrome Extension Manifest V3)  
**Primary Dependencies**: Chrome Extension APIs (chrome.storage, chrome.runtime, chrome.tabs, chrome.scripting)  
**Storage**: Chrome Storage API (local storage for session data and settings)  
**Testing**: Manual testing only (per constitution)  
**Target Platform**: Chrome browser (Manifest V3 compatible)  
**Project Type**: single - Chrome extension with content scripts, background service worker, and UI popup/sidepanel  
**Performance Goals**: No noticeable page performance degradation during tracking; handle thousands of events in a session  
**Constraints**: Must not track extension's own UI elements; local-first (no external dependencies); data persistence during recording session is priority  
**Scale/Scope**: Single-user browser extension; handle recording sessions with thousands of interaction events; persist settings across browser sessions

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**✅ Modular Monolith**: Extension architecture naturally separates tracking (content scripts), storage (background service worker), and UI (popup/sidepanel) into distinct modules that can directly call each other. No over-engineering - simple Chrome extension structure.

**✅ Workflow Integration First**: Recording controls and annotation interfaces designed to minimize disruption. Keyboard-driven annotation flow (auto-focus, tab navigation) allows users to continue interacting with web apps seamlessly.

**✅ Manual Quality Gates**: No automated test suite. Manual testing required before merge per constitution.

**✅ Performance & Data Constraints**: Tracking must not degrade page performance (constitutional requirement). Data stored locally via Chrome storage APIs. Export on demand. Priority: Data Persistence > Performance > UX > Privacy. Event rollup (FR-033) prevents excessive logging.

**✅ Spec-Driven Expansion**: This feature follows spec-first development. Scope clearly bounded. Future expansions (advanced filtering, cloud sync) deferred.

**✅ Local-First Architecture**: All data stays in browser storage. No external dependencies or cloud services.

**✅ Technology Compliance**: Chrome Extension Manifest V3 with vanilla JavaScript/TypeScript as needed.

**✅ Solo Development Workflow**: Feature branch `001-chrome-browser-extension`. Manual testing before merge.

**Status**: PASS - No constitutional violations. Architecture aligns with modular monolith principle. Workflow integration prioritized. Manual testing only.

## Project Structure

### Documentation (this feature)
```
specs/[###-feature]/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
src/
├── manifest.json           # Chrome extension manifest V3
├── background/             # Service worker
│   └── service-worker.js  # Background script for storage/coordination
├── content/                # Content scripts injected into pages
│   ├── tracker.js         # Main interaction tracking logic
│   └── dom-capture.js     # DOM context extraction
├── ui/                     # Extension UI components
│   ├── popup/             # Control panel (record/pause/stop)
│   │   ├── popup.html
│   │   ├── popup.js
│   │   └── popup.css
│   ├── sidepanel/         # Log viewing interface
│   │   ├── sidepanel.html
│   │   ├── sidepanel.js
│   │   └── sidepanel.css
│   └── annotation/        # Accept/reject/annotate overlays
│       ├── annotation.js
│       └── annotation.css
├── models/                 # Data structures
│   ├── recording-session.js
│   ├── interaction-event.js
│   └── event-config.js
├── services/               # Business logic
│   ├── storage-service.js # Chrome storage wrapper
│   ├── export-service.js  # JSON export/download
│   └── event-processor.js # Event rollup/filtering
└── lib/                    # Utilities
    ├── dom-utils.js
    └── keyboard-utils.js

tests/                      # Manual test scenarios documentation
└── manual/
    └── test-scenarios.md
```

**Structure Decision**: Single project (Chrome extension). The extension uses a modular monolith approach with clear separation between tracking (content scripts), coordination/storage (background service worker), and UI (popup/sidepanel). This aligns with Chrome extension architecture requirements and the constitutional principle of modular organization without over-engineering.

## Phase 0: Outline & Research
1. **Extract unknowns from Technical Context** above:
   - For each NEEDS CLARIFICATION → research task
   - For each dependency → best practices task
   - For each integration → patterns task

2. **Generate and dispatch research agents**:
   ```
   For each unknown in Technical Context:
     Task: "Research {unknown} for {feature context}"
   For each technology choice:
     Task: "Find best practices for {tech} in {domain}"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: research.md with all NEEDS CLARIFICATION resolved

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - Entity name, fields, relationships
   - Validation rules from requirements
   - State transitions if applicable

2. **Generate API contracts** from functional requirements:
   - For each user action → endpoint
   - Use standard REST/GraphQL patterns
   - Output OpenAPI/GraphQL schema to `/contracts/`

3. **Generate contract tests** from contracts:
   - One test file per endpoint
   - Assert request/response schemas
   - Tests must fail (no implementation yet)

4. **Extract test scenarios** from user stories:
   - Each story → integration test scenario
   - Quickstart test = story validation steps

5. **Update agent file incrementally** (O(1) operation):
   - Run `.specify/scripts/powershell/update-agent-context.ps1 -AgentType copilot`
     **IMPORTANT**: Execute it exactly as specified above. Do not add or remove any arguments.
   - If exists: Add only NEW tech from current plan
   - Preserve manual additions between markers
   - Update recent changes (keep last 3)
   - Keep under 150 lines for token efficiency
   - Output to repository root

**Output**: data-model.md, /contracts/*, failing tests, quickstart.md, agent-specific file

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Load `.specify/templates/tasks-template.md` as base
- Generate tasks from Phase 1 design docs (data-model.md, contracts/, quickstart.md)
- Organize by architectural layer: manifest → models → services → content scripts → UI

**Task Categories**:

1. **Foundation Tasks** (1-5):
   - Create manifest.json with required permissions
   - Set up project structure (directories)
   - Create data model files (RecordingSession, InteractionEvent, ElementDetails, etc.)
   - Create EventConfiguration model
   - Create error type definitions

2. **Service Layer Tasks** (6-15): [P] = can run in parallel
   - Implement StorageService [P]
     - Session management methods
     - Event management methods
     - Configuration management methods
     - Storage stats and cleanup
   - Implement ExportService [P]
     - JSON generation
     - Property order enforcement
     - Filename formatting
     - Download trigger
   - Implement EventProcessorService [P]
     - Event processing pipeline
     - Event rollup logic
     - Element filtering
     - DOM extraction utilities

3. **Background Script Tasks** (16-20):
   - Create service-worker.js
   - Initialize services on install
   - Handle runtime messages from content/UI
   - Coordinate storage operations
   - Manage session lifecycle

4. **Content Script Tasks** (21-30): [P] = some can run in parallel
   - Create tracker.js for event listeners [P]
   - Create dom-capture.js for DOM extraction [P]
   - Implement event capture for each type (click, keypress, etc.)
   - Implement element ignore logic
   - Create annotation overlay UI
   - Implement accept/reject popup (FR-015, FR-016, FR-034)
   - Implement annotation input popup (FR-035, FR-036)
   - Implement keyboard navigation
   - Handle event rollup coordination
   - Inject CSS for overlays

5. **UI Component Tasks** (31-40): [P] = can run in parallel
   - Create popup.html/css/js [P]
     - Record/Pause/Resume/Stop buttons
     - Recording state indicators
     - Settings link
   - Create sidepanel.html/css/js [P]
     - Log list view
     - Event detail display
     - Chronological ordering
     - Real-time updates
   - Create settings/options page [P]
     - Event type checkboxes
     - Configuration save/load
     - Reset to defaults

6. **Integration Tasks** (41-45):
   - Wire recording controls to background service
   - Connect content scripts to storage
   - Implement real-time log updates
   - Test cross-component communication
   - Handle state synchronization

7. **Manual Testing Tasks** (46-50):
   - Execute quickstart.md test suite 1 (recording controls)
   - Execute quickstart.md test suite 2 (interaction capture)
   - Execute quickstart.md test suite 3 (event management)
   - Execute quickstart.md test suite 4 (log viewing)
   - Execute quickstart.md test suite 5 (JSON output)
   - Execute quickstart.md test suite 6 (configuration)
   - Test all edge cases from quickstart.md
   - Performance validation
   - Browser compatibility check

**Ordering Strategy**:
1. **Foundation first**: Manifest and data models (no dependencies)
2. **Services second**: Core business logic (depends on models)
3. **Scripts third**: Background and content scripts (depend on services)
4. **UI fourth**: User interface components (depend on scripts)
5. **Integration fifth**: Connect all components
6. **Testing last**: Validate complete system

**Dependency Chains**:
- Models → Services → Scripts → UI
- Manifest → All other components
- Background script ← Content scripts → UI components
- StorageService ← All components

**Parallelization** (marked with [P]):
- All three service implementations can be developed in parallel
- Content script modules can be developed in parallel
- UI components can be developed in parallel
- Testing can be parallelized by test suite

**Estimated Output**: 45-50 numbered, ordered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |


## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [x] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS (no new violations)
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented (none - no violations)

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*
