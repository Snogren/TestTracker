/**
 * EventConfiguration Model
 * User preferences for which interaction types should be captured
 * Based on data-model.md EventConfiguration entity
 */

import '../models/types.js';

/**
 * @class EventConfiguration
 */
export class EventConfiguration {
  /**
   * @param {EventType[]} enabledEventTypes - Array of enabled interaction types
   * @param {number} maxDOMDepth - Maximum parent levels to capture (default: 5)
   * @param {number} maxSiblings - Maximum siblings each direction (default: 2)
   */
  constructor(enabledEventTypes, maxDOMDepth = 5, maxSiblings = 2) {
    this.enabledEventTypes = enabledEventTypes;
    this.maxDOMDepth = maxDOMDepth;
    this.maxSiblings = maxSiblings;
    
    this._validate();
  }

  /**
   * Validate configuration data
   * @private
   * @throws {Error} if validation fails
   */
  _validate() {
    const validEventTypes = ['click', 'dblclick', 'keypress', 'hover', 'scroll', 'focus', 'blur', 'navigation'];
    
    if (!Array.isArray(this.enabledEventTypes)) {
      throw new Error('enabledEventTypes must be an array');
    }
    
    if (this.enabledEventTypes.length === 0) {
      throw new Error('enabledEventTypes must contain at least one type');
    }
    
    this.enabledEventTypes.forEach(type => {
      if (!validEventTypes.includes(type)) {
        throw new Error(`Invalid event type: ${type}. Must be one of: ${validEventTypes.join(', ')}`);
      }
    });
    
    if (typeof this.maxDOMDepth !== 'number' || this.maxDOMDepth < 1 || this.maxDOMDepth > 10) {
      throw new Error('maxDOMDepth must be a number >= 1 and <= 10');
    }
    
    if (typeof this.maxSiblings !== 'number' || this.maxSiblings < 0 || this.maxSiblings > 5) {
      throw new Error('maxSiblings must be a number >= 0 and <= 5');
    }
  }

  /**
   * Check if an event type is enabled
   * @param {EventType} eventType
   * @returns {boolean}
   */
  isEnabled(eventType) {
    return this.enabledEventTypes.includes(eventType);
  }

  /**
   * Enable an event type
   * @param {EventType} eventType
   */
  enableEventType(eventType) {
    if (!this.enabledEventTypes.includes(eventType)) {
      this.enabledEventTypes.push(eventType);
    }
  }

  /**
   * Disable an event type
   * @param {EventType} eventType
   */
  disableEventType(eventType) {
    const index = this.enabledEventTypes.indexOf(eventType);
    if (index > -1) {
      this.enabledEventTypes.splice(index, 1);
    }
    
    // Ensure at least one type remains
    if (this.enabledEventTypes.length === 0) {
      throw new Error('Cannot disable all event types. At least one must be enabled.');
    }
  }

  /**
   * Convert to plain object for storage
   * @returns {Object}
   */
  toJSON() {
    return {
      enabledEventTypes: this.enabledEventTypes,
      maxDOMDepth: this.maxDOMDepth,
      maxSiblings: this.maxSiblings
    };
  }

  /**
   * Create EventConfiguration from plain object
   * @param {Object} data
   * @returns {EventConfiguration}
   */
  static fromJSON(data) {
    return new EventConfiguration(
      data.enabledEventTypes,
      data.maxDOMDepth,
      data.maxSiblings
    );
  }

  /**
   * Create default configuration
   * @returns {EventConfiguration}
   */
  static createDefault() {
    return new EventConfiguration(
      ['click', 'keypress', 'focus', 'blur', 'scroll', 'navigation'],
      5,
      2
    );
  }
}
