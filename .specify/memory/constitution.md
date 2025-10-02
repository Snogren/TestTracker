# DOM Tracker Constitution

## Core Principles

### I. Modular Monolith
Keep it simple but organized. Separate concerns (tracking, storage, UI) into distinct modules within the monolith. Each module should have a clear purpose, but they can directly call each other. No over-engineering - architecture emerges through refactoring, not upfront design.

### II. Workflow Integration First
User experience must integrate as least-disruptively into the user's existing workflow. User experience drives design decisions. They should be able to switch between interacting with a web app and recording/annotating/managing their logs as seamlessly as possible.

### III. Manual Quality Gates (NON-NEGOTIABLE)
Every feature branch must be manually tested before merge. No automated test suite required - manual testing only.

### IV. Performance & Data Constraints
Tracking must not degrade page performance. Logs stored locally via Chrome storage APIs. Export to file on demand. Data size should be monitored but no hard limits initially - optimize if issues arise. Priority: Data Persistence during recording session > Performance > UX > Privacy.

### V. Spec-Driven Expansion
New features require spec files before implementation. Specs prevent scope creep and document decisions. Keep it simple (YAGNI), but make expansion paths clear in specs. Start simple and add complexity only when justified.

## Technical Standards

**Local-First Architecture**: All data stays in browser storage. No external dependencies or cloud services in initial implementation.

**Export Format**: JSON for programmatic use.

**Versioning**: MAJOR.MINOR.PATCH semantic versioning. Breaking changes acceptable between major versions.

**Technology**: Chrome Extension Manifest V3, vanilla JavaScript or TypeScript as needed.

## Development Workflow

**Feature Branches**: All new work happens in feature branches. Merge to main only after manual testing completion.

**Spec-First Development**: Write spec files before implementing features. Specs guide implementation and prevent scope creep.

**Vibe-Compatible Process**: No rigid upfront design. Allow architecture to emerge naturally through development and refactoring.

**Solo Development**: Single developer workflow. No formal code review process required.

## Governance

**Constitution as Guide**: This constitution guides development but doesn't block progress. Update when patterns emerge or priorities shift.

**Complexity Justification**: All complexity must solve a real problem. No premature optimization or over-engineering.

**Spec Files Authority**: Use spec files in `.specify/` directory for feature planning and scope management.

**Amendment Process**: Constitution can be updated at any time to reflect new insights or changing priorities.

**Version**: 1.0.0 | **Ratified**: 2025-10-02 | **Last Amended**: 2025-10-02