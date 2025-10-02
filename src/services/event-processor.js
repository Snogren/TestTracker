/**
 * EventProcessorService
 * Process, filter, and roll up interaction events before storage
 * Based on contracts/event-processor-service.md
 */

import { InteractionEvent } from '../models/interaction-event.js';
import { ElementDetails, DOMContext } from '../models/element-details.js';
import { EventProcessingError } from '../models/errors.js';

/**
 * @class EventProcessorService
 */
export class EventProcessorService {
  constructor() {
    // Track rollup state
    this.lastAcceptedEvent = null;
    this.contextBroken = false;
    this.currentFocusedElement = null;
  }

  // ============================================================================
  // Event Processing
  // ============================================================================

  /**
   * Main processing pipeline: filters, extracts details, prepares for storage
   * @param {Object} rawEvent - RawInteractionEvent
   * @param {Object} config - EventConfiguration
   * @returns {Promise<InteractionEvent|null>}
   */
  async processEvent(rawEvent, config) {
    try {
      // Check if event type is enabled
      if (!this.isEventEnabled(rawEvent.eventType, config)) {
        return null;
      }

      // Check if element should be ignored
      if (this.shouldIgnoreElement(rawEvent.element)) {
        return null;
      }

      // Extract element details and DOM context
      const elementDetails = this.extractElementDetails(rawEvent.element, config);

      // Create InteractionEvent
      const event = new InteractionEvent(
        rawEvent.pageTitle || document.title,
        rawEvent.annotation || '',
        rawEvent.eventType,
        rawEvent.textInput || null,
        rawEvent.pageUrl || window.location.href,
        elementDetails,
        rawEvent.timestamp ? rawEvent.timestamp.toISOString() : new Date().toISOString(),
        rawEvent.eventCount || null
      );

      return event;
    } catch (error) {
      console.warn('Event processing failed:', error);
      return null;
    }
  }

  /**
   * Combines consecutive repeated interactions into single event
   * @param {Object} rawEvent - RawInteractionEvent
   * @param {InteractionEvent[]} recentEvents - Recent events from session (last 10)
   * @param {Object} config - EventConfiguration
   * @returns {Promise<Object>} { event: InteractionEvent, shouldRollup: boolean, existingEventIndex: number }
   */
  async rollupEvent(rawEvent, recentEvents, config) {
    try {
      // Check if rollup is applicable
      if (!this.lastAcceptedEvent || this.contextBroken) {
        // No previous event or context was broken - create new event
        return {
          event: await this.processEvent(rawEvent, config),
          shouldRollup: false,
          existingEventIndex: -1
        };
      }

      // Check if same element and same type
      const selector = this.generateSelector(rawEvent.element);
      const isSameElement = this.lastAcceptedEvent.elementDetails.selector === selector;
      const isSameType = this.lastAcceptedEvent.interactionType === rawEvent.eventType;

      if (!isSameElement || !isSameType) {
        // Different element or type - break sequence, create new event
        this.contextBroken = true;
        return {
          event: await this.processEvent(rawEvent, config),
          shouldRollup: false,
          existingEventIndex: -1
        };
      }

      // Only roll up clicks and keypresses
      if (!['click', 'keypress'].includes(rawEvent.eventType)) {
        return {
          event: await this.processEvent(rawEvent, config),
          shouldRollup: false,
          existingEventIndex: -1
        };
      }

      // Find the existing event in recentEvents
      const existingEventIndex = recentEvents.findIndex(
        e => e.elementDetails.selector === selector && e.interactionType === rawEvent.eventType
      );

      if (existingEventIndex === -1) {
        // Shouldn't happen, but be defensive
        return {
          event: await this.processEvent(rawEvent, config),
          shouldRollup: false,
          existingEventIndex: -1
        };
      }

      const existingEvent = recentEvents[existingEventIndex];

      // Roll up based on event type
      let rolledUpEvent;
      if (rawEvent.eventType === 'click') {
        rolledUpEvent = this._rollupClick(existingEvent, rawEvent);
      } else if (rawEvent.eventType === 'keypress') {
        rolledUpEvent = this._rollupKeypress(existingEvent, rawEvent);
      }

      return {
        event: InteractionEvent.fromJSON(rolledUpEvent),
        shouldRollup: true,
        existingEventIndex: existingEventIndex
      };
    } catch (error) {
      console.warn('Event rollup failed:', error);
      // Defensive - return new event if rollup fails
      return {
        event: await this.processEvent(rawEvent, config),
        shouldRollup: false,
        existingEventIndex: -1
      };
    }
  }

  /**
   * Mark context as broken (for break events like blur, focus)
   */
  markContextBroken() {
    this.contextBroken = true;
  }

  /**
   * Reset rollup state after event is accepted
   * @param {InteractionEvent} event
   */
  resetRollupState(event) {
    this.lastAcceptedEvent = event;
    this.contextBroken = false;
  }

  /**
   * Check if event is a break event (blur, focus)
   * @param {string} eventType
   * @returns {boolean}
   */
  isBreakEvent(eventType) {
    return ['blur', 'focus'].includes(eventType);
  }

  // ============================================================================
  // Filtering
  // ============================================================================

  /**
   * Checks if a specific event type should be captured
   * @param {string} eventType - EventType
   * @param {Object} config - EventConfiguration
   * @returns {boolean}
   */
  isEventEnabled(eventType, config) {
    try {
      return config.enabledEventTypes.includes(eventType);
    } catch (error) {
      return false;
    }
  }

  /**
   * Determines if an element should not be tracked
   * @param {HTMLElement} element
   * @returns {boolean}
   */
  shouldIgnoreElement(element) {
    try {
      // Check if element is part of extension UI
      if (element.classList && Array.from(element.classList).some(c => c.startsWith('dom-tracker-'))) {
        return true;
      }

      // Check if any parent is part of extension UI
      let parent = element.parentElement;
      while (parent) {
        if (parent.classList && Array.from(parent.classList).some(c => c.startsWith('dom-tracker-'))) {
          return true;
        }
        parent = parent.parentElement;
      }

      // Check for chrome:// URLs
      if (window.location.protocol === 'chrome:' || window.location.protocol === 'chrome-extension:') {
        return true;
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  // ============================================================================
  // Utilities
  // ============================================================================

  /**
   * Captures comprehensive information about an element
   * @param {HTMLElement} element
   * @param {Object} config - EventConfiguration
   * @returns {ElementDetails}
   */
  extractElementDetails(element, config) {
    try {
      const selector = this.generateSelector(element);
      const domContext = this.extractDOMContext(element, config);

      const attributes = {
        type: element.getAttribute('type') || null,
        name: element.getAttribute('name') || null,
        value: element.value || null,
        placeholder: element.getAttribute('placeholder') || null
      };

      // Add other relevant attributes
      const relevantAttrs = ['href', 'src', 'alt', 'title', 'aria-label', 'role', 'data-testid'];
      relevantAttrs.forEach(attr => {
        const value = element.getAttribute(attr);
        if (value) {
          attributes[attr] = value;
        }
      });

      return new ElementDetails(
        this._truncate(element.outerHTML, 5000),
        selector,
        element.tagName.toUpperCase(),
        element.id || null,
        Array.from(element.classList),
        this._truncate(element.textContent.trim(), 1000),
        attributes,
        domContext
      );
    } catch (error) {
      // Defensive - return minimal details if extraction fails
      return new ElementDetails(
        '<unknown>',
        'unknown',
        element.tagName || 'UNKNOWN',
        null,
        [],
        '',
        {},
        new DOMContext([], { previous: null, next: null }, '/unknown')
      );
    }
  }

  /**
   * Captures surrounding DOM structure for element location
   * @param {HTMLElement} element
   * @param {Object} config - EventConfiguration
   * @returns {DOMContext}
   */
  extractDOMContext(element, config) {
    try {
      const maxDepth = config.maxDOMDepth || 5;
      const maxSiblings = config.maxSiblings || 2;

      // Extract parents
      const parents = [];
      let parent = element.parentElement;
      let depth = 0;

      while (parent && depth < maxDepth && parent !== document.body) {
        parents.push({
          tagName: parent.tagName.toUpperCase(),
          selector: this.generateSelector(parent),
          id: parent.id || null,
          classes: Array.from(parent.classList)
        });
        parent = parent.parentElement;
        depth++;
      }

      // Extract siblings
      const siblings = {
        previous: element.previousElementSibling 
          ? this._truncate(element.previousElementSibling.outerHTML, 500) 
          : null,
        next: element.nextElementSibling 
          ? this._truncate(element.nextElementSibling.outerHTML, 500) 
          : null
      };

      // Generate XPath
      const xpath = this.generateXPath(element);

      return new DOMContext(parents, siblings, xpath);
    } catch (error) {
      // Defensive - return minimal context if traversal fails
      return new DOMContext([], { previous: null, next: null }, '/unknown');
    }
  }

  /**
   * Creates a unique CSS selector for an element
   * @param {HTMLElement} element
   * @returns {string}
   */
  generateSelector(element) {
    try {
      // Strategy 1: ID selector
      if (element.id) {
        return `#${element.id}`;
      }

      // Strategy 2: Unique classes
      if (element.className && typeof element.className === 'string') {
        const classes = element.className.trim().split(/\s+/).filter(c => c);
        if (classes.length > 0) {
          const selector = `${element.tagName.toLowerCase()}.${classes.join('.')}`;
          if (document.querySelectorAll(selector).length === 1) {
            return selector;
          }
        }
      }

      // Strategy 3: Unique attributes
      const uniqueAttrs = ['name', 'data-testid', 'aria-label'];
      for (const attr of uniqueAttrs) {
        const value = element.getAttribute(attr);
        if (value) {
          const selector = `${element.tagName.toLowerCase()}[${attr}="${value}"]`;
          if (document.querySelectorAll(selector).length === 1) {
            return selector;
          }
        }
      }

      // Strategy 4: Parent + nth-child
      if (element.parentElement) {
        const parent = element.parentElement;
        const parentSelector = parent.id ? `#${parent.id}` : parent.tagName.toLowerCase();
        const siblings = Array.from(parent.children);
        const index = siblings.indexOf(element) + 1;
        return `${parentSelector} > ${element.tagName.toLowerCase()}:nth-child(${index})`;
      }

      // Fallback: tag name
      return element.tagName.toLowerCase();
    } catch (error) {
      return element.tagName ? element.tagName.toLowerCase() : 'unknown';
    }
  }

  /**
   * Creates an XPath expression for an element
   * @param {HTMLElement} element
   * @returns {string}
   */
  generateXPath(element) {
    try {
      if (element.id) {
        return `//*[@id="${element.id}"]`;
      }

      const parts = [];
      let current = element;

      while (current && current.nodeType === Node.ELEMENT_NODE) {
        let index = 0;
        let sibling = current.previousSibling;

        while (sibling) {
          if (sibling.nodeType === Node.ELEMENT_NODE && sibling.nodeName === current.nodeName) {
            index++;
          }
          sibling = sibling.previousSibling;
        }

        const tagName = current.nodeName.toLowerCase();
        const part = index > 0 ? `${tagName}[${index + 1}]` : tagName;
        parts.unshift(part);

        current = current.parentNode;
      }

      return parts.length ? `/${parts.join('/')}` : '/unknown';
    } catch (error) {
      return '/unknown';
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Roll up click events
   * @private
   * @param {Object} existingEvent
   * @param {Object} newEvent
   * @returns {Object}
   */
  _rollupClick(existingEvent, newEvent) {
    return {
      ...existingEvent,
      eventCount: (existingEvent.eventCount || 1) + 1
      // Keep first timestamp
    };
  }

  /**
   * Roll up keypress events
   * @private
   * @param {Object} existingEvent
   * @param {Object} newEvent
   * @returns {Object}
   */
  _rollupKeypress(existingEvent, newEvent) {
    return {
      ...existingEvent,
      textInput: (existingEvent.textInput || '') + (newEvent.textInput || ''),
      timestamp: newEvent.timestamp ? newEvent.timestamp.toISOString() : new Date().toISOString(),
      eventCount: (existingEvent.eventCount || 1) + 1
    };
  }

  /**
   * Truncate string to max length
   * @private
   * @param {string} str
   * @param {number} maxLength
   * @returns {string}
   */
  _truncate(str, maxLength) {
    if (!str) return '';
    return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
  }
}
