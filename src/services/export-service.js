/**
 * ExportService
 * Generate and download JSON files from recording sessions
 * Based on contracts/export-service.md
 */

import { RecordingSession } from '../models/recording-session.js';
import { ExportError, SessionNotFoundError, ValidationError } from '../models/errors.js';

/**
 * @class ExportService
 */
export class ExportService {
  /**
   * @param {StorageService} storageService - Storage service instance
   */
  constructor(storageService) {
    this.storageService = storageService;
  }

  // ============================================================================
  // Export Operations
  // ============================================================================

  /**
   * Complete export workflow: generate JSON and trigger browser download
   * @param {string} sessionId - Session to export
   * @returns {Promise<Object>} ExportResult
   * @throws {SessionNotFoundError} if session doesn't exist
   * @throws {ExportError} if JSON generation or download fails
   */
  async exportSession(sessionId) {
    try {
      // Retrieve session from storage
      const session = await this.storageService.getSession(sessionId);
      
      if (!session) {
        throw new SessionNotFoundError(sessionId);
      }

      // Ensure session is stopped
      if (session.status !== 'stopped') {
        await this.storageService.stopSession(sessionId);
        // Refresh session after stopping
        const stoppedSession = await this.storageService.getSession(sessionId);
        if (stoppedSession) {
          Object.assign(session, stoppedSession);
        }
      }

      // Generate JSON
      const jsonContent = await this.generateJSON(session);
      
      // Format filename
      const filename = this.formatFilename(session);
      
      // Trigger download
      await this.downloadJSON(filename, jsonContent);

      return {
        success: true,
        filename: filename,
        sizeBytes: new Blob([jsonContent]).size,
        eventCount: session.events.length
      };
    } catch (error) {
      if (error instanceof SessionNotFoundError) {
        throw error;
      }
      throw new ExportError(`Failed to export session: ${error.message}`);
    }
  }

  /**
   * Converts a RecordingSession to properly formatted JSON string
   * @param {RecordingSession} session - Session to convert
   * @returns {Promise<string>} JSON string with proper structure
   * @throws {ValidationError} if session object invalid
   * @throws {ExportError} if JSON generation fails
   */
  async generateJSON(session) {
    try {
      if (!(session instanceof RecordingSession)) {
        throw new ValidationError('Invalid session object');
      }

      // Create export structure with proper property order
      const exportData = {
        sessionId: session.sessionId,
        startTime: session.startTime,
        endTime: session.endTime,
        totalEvents: session.metadata.totalEvents,
        browserInfo: session.metadata.browserInfo,
        events: session.events.map(event => this._formatEvent(event))
      };

      // Generate JSON with 2-space indentation
      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ExportError(`Failed to generate JSON: ${error.message}`);
    }
  }

  /**
   * Triggers browser download with specified filename and content
   * @param {string} filename - Name for downloaded file
   * @param {string} content - JSON content to download
   * @returns {Promise<void>}
   * @throws {ExportError} if download fails
   */
  async downloadJSON(filename, content) {
    try {
      // Create blob
      const blob = new Blob([content], { type: 'application/json' });
      
      // Generate object URL
      const url = URL.createObjectURL(blob);

      // Trigger download using Chrome downloads API
      await chrome.downloads.download({
        url: url,
        filename: filename,
        saveAs: true  // Prompt user for location (FR-027)
      });

      // Clean up object URL after a delay
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (error) {
      throw new ExportError(`Failed to download JSON: ${error.message}`);
    }
  }

  // ============================================================================
  // Format Utilities
  // ============================================================================

  /**
   * Generates standardized filename with timestamp
   * Format: dom-tracker-YYYYMMDD-HHMMSS.json
   * @param {RecordingSession} session - Session to name
   * @returns {string}
   */
  formatFilename(session) {
    try {
      const date = new Date(session.startTime);
      
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      
      return `dom-tracker-${year}${month}${day}-${hours}${minutes}${seconds}.json`;
    } catch (error) {
      // Defensive - return default if session invalid
      return 'dom-tracker-export.json';
    }
  }

  /**
   * Verifies exported JSON matches required structure
   * @param {string} json - JSON content to validate
   * @returns {Object} ValidationResult
   */
  validateJSONStructure(json) {
    const result = {
      valid: true,
      errors: [],
      warnings: []
    };

    try {
      // Check valid JSON syntax
      const data = JSON.parse(json);

      // Check required top-level fields
      const requiredFields = ['sessionId', 'startTime', 'endTime', 'totalEvents', 'browserInfo', 'events'];
      for (const field of requiredFields) {
        if (!(field in data)) {
          result.errors.push(`Missing required field: ${field}`);
          result.valid = false;
        }
      }

      // Check events array
      if (!Array.isArray(data.events)) {
        result.errors.push('events must be an array');
        result.valid = false;
      } else {
        // Validate event structure
        data.events.forEach((event, index) => {
          const eventErrors = this._validateEventStructure(event, index);
          result.errors.push(...eventErrors);
        });
      }

      // Check property order (FR-014)
      const eventKeys = Object.keys(data.events[0] || {});
      const expectedOrder = ['pageTitle', 'annotation', 'interactionType', 'textInput', 'url', 'elementDetails', 'timestamp', 'eventCount'];
      
      if (eventKeys.length > 0 && JSON.stringify(eventKeys) !== JSON.stringify(expectedOrder)) {
        result.warnings.push('Event properties may not be in the required order');
      }

      if (result.errors.length > 0) {
        result.valid = false;
      }
    } catch (error) {
      result.valid = false;
      result.errors.push(`Invalid JSON syntax: ${error.message}`);
    }

    return result;
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Format event with proper property order (FR-014)
   * @private
   * @param {Object} event - Event data
   * @returns {Object}
   */
  _formatEvent(event) {
    return {
      pageTitle: event.pageTitle,
      annotation: event.annotation,
      interactionType: event.interactionType,
      textInput: event.textInput,
      url: event.url,
      elementDetails: event.elementDetails,
      timestamp: event.timestamp,
      eventCount: event.eventCount
    };
  }

  /**
   * Validate individual event structure
   * @private
   * @param {Object} event - Event to validate
   * @param {number} index - Event index
   * @returns {string[]} Array of error messages
   */
  _validateEventStructure(event, index) {
    const errors = [];

    const requiredFields = ['pageTitle', 'annotation', 'interactionType', 'url', 'elementDetails', 'timestamp'];
    for (const field of requiredFields) {
      if (!(field in event)) {
        errors.push(`Event ${index}: Missing required field: ${field}`);
      }
    }

    // Check elementDetails structure
    if (event.elementDetails) {
      const requiredElementFields = ['html', 'selector', 'tagName', 'classes', 'textContent', 'attributes', 'domContext'];
      for (const field of requiredElementFields) {
        if (!(field in event.elementDetails)) {
          errors.push(`Event ${index}: Missing elementDetails field: ${field}`);
        }
      }

      // Check domContext structure
      if (event.elementDetails.domContext) {
        const requiredContextFields = ['parents', 'siblings', 'xpath'];
        for (const field of requiredContextFields) {
          if (!(field in event.elementDetails.domContext)) {
            errors.push(`Event ${index}: Missing domContext field: ${field}`);
          }
        }
      }
    }

    return errors;
  }
}
