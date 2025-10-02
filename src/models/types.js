/**
 * Type definitions for DOM Interaction Recorder Extension
 * Based on data-model.md
 */

/**
 * @typedef {'click' | 'dblclick' | 'keypress' | 'hover' | 'scroll' | 'focus' | 'blur' | 'navigation'} EventType
 * Supported interaction types that can be captured
 */

/**
 * @typedef {'recording' | 'paused' | 'stopped'} SessionStatus
 * Current state of a recording session
 */

/**
 * @typedef {Object} RecordingSession
 * @property {string} sessionId - UUID unique identifier
 * @property {string} startTime - ISO 8601 timestamp when recording started
 * @property {string|null} endTime - ISO 8601 timestamp when recording stopped (null if active)
 * @property {SessionStatus} status - Current session state
 * @property {InteractionEvent[]} events - Array of captured interactions
 * @property {SessionMetadata} metadata - Additional session information
 */

/**
 * @typedef {Object} SessionMetadata
 * @property {string} browserInfo - Chrome version
 * @property {number} totalEvents - Count of events
 */

/**
 * @typedef {Object} InteractionEvent
 * @property {string} pageTitle - Page title at time of interaction
 * @property {string} annotation - User-provided description/notes
 * @property {EventType} interactionType - Type of interaction
 * @property {string|null} textInput - Text entered (for keypress events)
 * @property {string} url - Full URL at time of interaction
 * @property {ElementDetails} elementDetails - Information about the target element
 * @property {string} timestamp - ISO 8601 timestamp when interaction occurred
 * @property {number|null} eventCount - Number of rolled-up events (for repeated actions)
 */

/**
 * @typedef {Object} ElementDetails
 * @property {string} html - Outer HTML of the element
 * @property {string} selector - CSS selector to locate element
 * @property {string} tagName - HTML tag name (e.g., 'INPUT', 'BUTTON')
 * @property {string|null} id - Element ID attribute
 * @property {string[]} classes - Array of CSS classes
 * @property {string} textContent - Visible text content of element
 * @property {ElementAttributes} attributes - Key-value pairs of important attributes
 * @property {DOMContext} domContext - Surrounding DOM structure
 */

/**
 * @typedef {Object} ElementAttributes
 * @property {string|null} type - Input type, button type, etc.
 * @property {string|null} name - Form element name
 * @property {string|null} value - Current value
 * @property {string|null} placeholder - Placeholder text
 * @property {string|null} [key] - Other relevant attributes as needed
 */

/**
 * @typedef {Object} DOMContext
 * @property {ParentInfo[]} parents - Array of parent elements (up to 5 levels)
 * @property {SiblingInfo} siblings - Adjacent elements
 * @property {string} xpath - XPath to element (alternative locator)
 */

/**
 * @typedef {Object} ParentInfo
 * @property {string} tagName - Parent tag name
 * @property {string} selector - CSS selector for parent
 * @property {string|null} id - Parent ID
 * @property {string[]} classes - Parent classes
 */

/**
 * @typedef {Object} SiblingInfo
 * @property {string|null} previous - Previous sibling HTML (if exists)
 * @property {string|null} next - Next sibling HTML (if exists)
 */

/**
 * @typedef {Object} EventConfiguration
 * @property {EventType[]} enabledEventTypes - Array of enabled interaction types
 * @property {number} maxDOMDepth - Maximum parent levels to capture (default: 5)
 * @property {number} maxSiblings - Maximum siblings each direction (default: 2)
 */

// Export empty object for module compatibility
export {};
