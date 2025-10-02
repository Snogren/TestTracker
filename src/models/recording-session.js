/**
 * RecordingSession Model
 * Represents a recording session from start to stop
 * Based on data-model.md RecordingSession entity
 */

import '../models/types.js';

/**
 * @class RecordingSession
 */
export class RecordingSession {
  /**
   * @param {string} sessionId - UUID unique identifier
   * @param {string} startTime - ISO 8601 timestamp
   * @param {string|null} endTime - ISO 8601 timestamp (null if active)
   * @param {SessionStatus} status - Current session state
   * @param {InteractionEvent[]} events - Array of captured interactions
   * @param {SessionMetadata} metadata - Additional session information
   */
  constructor(sessionId, startTime, endTime = null, status = 'recording', events = [], metadata = {}) {
    this.sessionId = sessionId;
    this.startTime = startTime;
    this.endTime = endTime;
    this.status = status;
    this.events = events;
    this.metadata = {
      browserInfo: metadata.browserInfo || this._getBrowserInfo(),
      totalEvents: metadata.totalEvents || 0
    };
    
    this._validate();
  }

  /**
   * Validate session data
   * @private
   * @throws {Error} if validation fails
   */
  _validate() {
    if (!this.sessionId || typeof this.sessionId !== 'string') {
      throw new Error('sessionId must be a non-empty string');
    }
    
    if (!this._isValidISO8601(this.startTime)) {
      throw new Error('startTime must be a valid ISO 8601 timestamp');
    }
    
    if (this.endTime !== null && !this._isValidISO8601(this.endTime)) {
      throw new Error('endTime must be null or a valid ISO 8601 timestamp');
    }
    
    if (this.endTime && new Date(this.endTime) <= new Date(this.startTime)) {
      throw new Error('endTime must be after startTime');
    }
    
    if (!['recording', 'paused', 'stopped'].includes(this.status)) {
      throw new Error('status must be one of: recording, paused, stopped');
    }
    
    if (!Array.isArray(this.events)) {
      throw new Error('events must be an array');
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
    return date instanceof Date && !isNaN(date.getTime()) && date.toISOString() === timestamp;
  }

  /**
   * Get browser information
   * @private
   * @returns {string}
   */
  _getBrowserInfo() {
    return navigator.userAgent || 'Unknown';
  }

  /**
   * Transition to recording state
   * @returns {RecordingSession}
   */
  toRecording() {
    if (this.status === 'stopped') {
      throw new Error('Cannot resume a stopped session');
    }
    this.status = 'recording';
    return this;
  }

  /**
   * Transition to paused state
   * @returns {RecordingSession}
   */
  toPaused() {
    if (this.status !== 'recording') {
      throw new Error('Can only pause a recording session');
    }
    this.status = 'paused';
    return this;
  }

  /**
   * Transition to stopped state
   * @returns {RecordingSession}
   */
  toStopped() {
    if (this.status === 'stopped') {
      throw new Error('Session is already stopped');
    }
    this.status = 'stopped';
    this.endTime = new Date().toISOString();
    return this;
  }

  /**
   * Add an event to the session
   * @param {InteractionEvent} event
   */
  addEvent(event) {
    this.events.push(event);
    this.metadata.totalEvents = this.events.length;
  }

  /**
   * Convert to plain object for storage
   * @returns {Object}
   */
  toJSON() {
    return {
      sessionId: this.sessionId,
      startTime: this.startTime,
      endTime: this.endTime,
      status: this.status,
      events: this.events,
      metadata: this.metadata
    };
  }

  /**
   * Create RecordingSession from plain object
   * @param {Object} data
   * @returns {RecordingSession}
   */
  static fromJSON(data) {
    return new RecordingSession(
      data.sessionId,
      data.startTime,
      data.endTime,
      data.status,
      data.events,
      data.metadata
    );
  }

  /**
   * Create a new recording session
   * @param {string} sessionId
   * @returns {RecordingSession}
   */
  static create(sessionId) {
    return new RecordingSession(
      sessionId,
      new Date().toISOString(),
      null,
      'recording',
      [],
      {}
    );
  }
}
