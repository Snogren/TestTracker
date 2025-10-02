# DOM Interaction Recorder - Chrome Extension

A Chrome browser extension that records user interactions with websites, providing controls (record, pause, resume, stop), an annotation system for events, customizable event capture, and JSON export.

## Features

- **Recording Controls**: Start, pause, resume, and stop recording sessions
- **Event Capture**: Tracks clicks, keypresses, focus/blur, scroll, hover, double-clicks, and navigation
- **Annotation System**: Accept/reject events with optional annotations
- **Customizable**: Enable/disable specific event types
- **JSON Export**: Automatically exports sessions with full DOM context
- **Real-time Logging**: View captured events in a side panel
- **Event Rollup**: Automatically combines consecutive interactions

## Installation

1. Clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select the `src` folder from this repository

## Usage

### Recording Interactions

1. Click the extension icon in the Chrome toolbar
2. Click "Record" to start capturing interactions
3. Interact with any webpage
4. Each interaction will prompt you to accept/reject and optionally annotate
5. Click "Pause" to temporarily stop capturing (you can "Resume" later)
6. Click "Stop" to end the session and download the JSON export

### Viewing Logs

1. Click "View Logs" in the popup to open the side panel
2. See all captured events in chronological order
3. Events update in real-time during recording

### Settings

1. Click "Settings" in the popup to open the options page
2. Enable/disable specific event types (click, keypress, etc.)
3. Adjust DOM context capture depth
4. Click "Save Settings" to apply changes
5. Changes apply immediately if recording is active

## JSON Export Format

The extension exports sessions as JSON files with the following structure:

```json
{
  "sessionId": "uuid",
  "startTime": "2025-10-02T14:35:00.000Z",
  "endTime": "2025-10-02T14:37:30.000Z",
  "totalEvents": 15,
  "browserInfo": "Chrome/119.0.0.0",
  "events": [
    {
      "pageTitle": "Example Page",
      "annotation": "User login",
      "interactionType": "click",
      "textInput": null,
      "url": "https://example.com/login",
      "elementDetails": {
        "html": "<button id='login-btn'>Login</button>",
        "selector": "#login-btn",
        "tagName": "BUTTON",
        "id": "login-btn",
        "classes": ["btn", "btn-primary"],
        "textContent": "Login",
        "attributes": {
          "type": "submit"
        },
        "domContext": {
          "parents": [...],
          "siblings": {...},
          "xpath": "/html/body/div[1]/form/button"
        }
      },
      "timestamp": "2025-10-02T14:35:12.345Z",
      "eventCount": null
    }
  ]
}
```

## Architecture

- **Background Service Worker**: Manages session state and coordinates between components
- **Content Script**: Captures interactions on web pages
- **Popup UI**: Recording controls and session status
- **Side Panel**: Real-time event log viewer
- **Options Page**: Configuration settings
- **Storage Service**: Manages Chrome local storage
- **Export Service**: Generates and downloads JSON files
- **Event Processor**: Filters, rolls up, and enriches events

## Development

### Project Structure

```
src/
├── manifest.json              # Extension manifest (Manifest V3)
├── background/
│   └── service-worker.js     # Background service worker
├── content/
│   └── tracker.js            # Content script for event capture
├── models/                    # Data models
├── services/                  # Business logic services
├── ui/                        # UI components
│   ├── popup/                # Extension popup
│   ├── sidepanel/            # Event log viewer
│   ├── options/              # Settings page
│   └── annotation/           # Annotation overlays
└── icons/                     # Extension icons
```

### Key Technologies

- **Chrome Extension Manifest V3**
- **Chrome APIs**: storage, downloads, tabs, scripting, sidePanel
- **Vanilla JavaScript** (no external dependencies)
- **Local-first architecture** (all data stored locally)

## Testing

Manual testing is required before using in production. See `specs/001-chrome-browser-extension/quickstart.md` for comprehensive test scenarios.

## License

MIT License - see LICENSE file for details

## Contributing

This extension follows a spec-driven development approach. All features are documented in the `specs/` directory.

1. Review the specification documents
2. Create a feature branch
3. Implement following the task breakdown in `tasks.md`
4. Manual testing per `quickstart.md`
5. Submit pull request

## Notes

- The extension does not track its own UI elements
- Storage quota is limited to Chrome's local storage limits (~10MB)
- Automatic cleanup removes old sessions when storage is full
- Event rollup prevents excessive logging of repeated interactions
- All data stays local - no cloud sync or external dependencies
