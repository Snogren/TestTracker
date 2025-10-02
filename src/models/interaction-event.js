/**
 * InteractionEvent Model
 * Represents a single user action captured during recording
 * Based on data-model.md InteractionEvent entity
 */

import '../models/types.js';

/**
 * @class InteractionEvent
 */
export class InteractionEvent {
  /**
   * @param {string} pageTitle - Page title at time of interaction
   * @param {string} annotation - User-provided description/notes
   * @param {EventType} interactionType - Type of interaction
   * @param {string|null} textInput - Text entered (for keypress events)
   * @param {string} url - Full URL at time of interaction
   * @param {ElementDetails} elementDetails - Information about the target element
   * @param {string} timestamp - ISO 8601 timestamp
   * @param {number|null} eventCount - Number of rolled-up events (for repeated actions)
   */
  constructor(pageTitle, annotation, interactionType, textInput, url, elementDetails, timestamp, eventCount = null) {
    this.pageTitle = pageTitle;
    this.annotation = annotation;
    this.interactionType = interactionType;
    this.textInput = textInput;
    this.url = url;
    this.elementDetails = elementDetails;
    this.timestamp = timestamp;
    this.eventCount = eventCount;
    
    this._validate();
  }

  /**
   * Validate event data
   * @private
   * @throws {Error} if validation fails
   */
  _validate() {
    if (typeof this.annotation !== 'string') {
      throw new Error('annotation must be a string');
    }
    
    const validEventTypes = ['click', 'dblclick', 'keypress', 'hover', 'scroll', 'focus', 'blur', 'navigation'];
    if (!validEventTypes.includes(this.interactionType)) {
      throw new Error(`interactionType must be one of: ${validEventTypes.join(', ')}`);
    }
    
    if (!this.pageTitle || typeof this.pageTitle !== 'string') {
      throw new Error('pageTitle must be a non-empty string');
    }
    
    if (!this._isValidURL(this.url)) {
      throw new Error('url must be a valid URL format');
    }
    
    if (!this.elementDetails || typeof this.elementDetails !== 'object') {
      throw new Error('elementDetails must be a valid ElementDetails object');
    }
    
    if (!this._isValidISO8601(this.timestamp)) {
      throw new Error('timestamp must be a valid ISO 8601 timestamp');
    }
    
    if (this.interactionType === 'keypress' && this.textInput === null) {
      throw new Error('textInput is required for keypress events');
    }
    
    if (this.interactionType !== 'keypress' && this.textInput !== null) {
      throw new Error('textInput should be null for non-keypress events');
    }
  }

  /**
   * Validate URL format
   * @private
   * @param {string} url
   * @returns {boolean}
   */
  _isValidURL(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate ISO 8601 timestamp
   * @private
   * @param {string} timestamp
   * @returns {boolean}
   */
  _isValidISO8601(timestamp) {
    if (typeof timestamp !== 'string') return false;
    const date = new Date(timestamp);
    return date instanceof Date && !isNaN(date.getTime());
  }

  /**
   * Convert to plain object for storage (with property order per FR-014)
   * @returns {Object}
   */
  toJSON() {
    return {
      pageTitle: this.pageTitle,
      annotation: this.annotation,
      interactionType: this.interactionType,
      textInput: this.textInput,
      url: this.url,
      elementDetails: this.elementDetails,
      timestamp: this.timestamp,
      eventCount: this.eventCount
    };
  }

  /**
   * Create InteractionEvent from plain object
   * @param {Object} data
   * @returns {InteractionEvent}
   */
  static fromJSON(data) {
    return new InteractionEvent(
      data.pageTitle,
      data.annotation,
      data.interactionType,
      data.textInput,
      data.url,
      data.elementDetails,
      data.timestamp,
      data.eventCount
    );
  }

  /**
   * Create a new interaction event
   * @param {EventType} interactionType
   * @param {Element} element
   * @param {ElementDetails} elementDetails
   * @param {string} annotation
   * @param {string|null} textInput
   * @returns {InteractionEvent}
   */
  static create(interactionType, element, elementDetails, annotation = '', textInput = null) {
    return new InteractionEvent(
      document.title,
      annotation,
      interactionType,
      textInput,
      window.location.href,
      elementDetails,
      new Date().toISOString(),
      null
    );
  }
}
