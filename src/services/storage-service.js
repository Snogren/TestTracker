/**
 * StorageService
 * Manages persistence of recording sessions and configuration using Chrome Storage API
 * Based on contracts/storage-service.md
 */

import { RecordingSession } from '../models/recording-session.js';
import { InteractionEvent } from '../models/interaction-event.js';
import { EventConfiguration } from '../models/event-config.js';
import {
  StorageError,
  SessionNotFoundError,
  ActiveSessionExistsError,
  NoActiveSessionError,
  ValidationError,
  QuotaExceededError
} from '../models/errors.js';

/**
 * @class StorageService
 */
export class StorageService {
  constructor() {
    this.STORAGE_KEYS = {
      ACTIVE_SESSION: 'activeSession',
      SESSIONS: 'sessions',
      CONFIG: 'eventConfig',
      STATS: 'storageStats'
    };
  }

  // ============================================================================
  // Session Management
  // ============================================================================

  /**
   * Creates a new recording session and sets it as active
   * @returns {Promise<RecordingSession>}
   * @throws {ActiveSessionExistsError} if active session already exists
   * @throws {StorageError} if storage operation fails
   */
  async createSession() {
    try {
      // Check if active session exists
      const activeSession = await this.getActiveSession();
      if (activeSession && activeSession.status === 'recording') {
        throw new ActiveSessionExistsError(activeSession.sessionId);
      }

      // If there's a paused session, stop it first
      if (activeSession) {
        await this.stopSession(activeSession.sessionId);
      }

      // Generate unique session ID
      const sessionId = this._generateUUID();
      
      // Create new session
      const session = RecordingSession.create(sessionId);

      // Store as active session
      await chrome.storage.local.set({
        [this.STORAGE_KEYS.ACTIVE_SESSION]: session.toJSON()
      });

      // Update stats
      await this._updateStats({ totalSessions: 1 });

      return session;
    } catch (error) {
      if (error instanceof ActiveSessionExistsError) {
        throw error;
      }
      throw new StorageError(`Failed to create session: ${error.message}`, error);
    }
  }

  /**
   * Retrieves the currently active recording session
   * @returns {Promise<RecordingSession|null>}
   * @throws {StorageError} if storage operation fails
   */
  async getActiveSession() {
    try {
      const result = await chrome.storage.local.get(this.STORAGE_KEYS.ACTIVE_SESSION);
      const data = result[this.STORAGE_KEYS.ACTIVE_SESSION];
      
      if (!data) {
        return null;
      }
      
      return RecordingSession.fromJSON(data);
    } catch (error) {
      throw new StorageError(`Failed to get active session: ${error.message}`, error);
    }
  }

  /**
   * Updates an existing session
   * @param {RecordingSession} session - Complete session object with updates
   * @returns {Promise<void>}
   * @throws {SessionNotFoundError} if session doesn't exist
   * @throws {ValidationError} if session object is invalid
   * @throws {StorageError} if storage operation fails
   */
  async updateSession(session) {
    try {
      if (!(session instanceof RecordingSession)) {
        throw new ValidationError('Invalid session object');
      }

      // Check if this is the active session
      const activeSession = await this.getActiveSession();
      
      if (activeSession && activeSession.sessionId === session.sessionId) {
        // Update active session
        await chrome.storage.local.set({
          [this.STORAGE_KEYS.ACTIVE_SESSION]: session.toJSON()
        });
      } else {
        // Update in sessions archive
        const sessions = await this._getSessions();
        const index = sessions.findIndex(s => s.sessionId === session.sessionId);
        
        if (index === -1) {
          throw new SessionNotFoundError(session.sessionId);
        }
        
        sessions[index] = session.toJSON();
        await chrome.storage.local.set({
          [this.STORAGE_KEYS.SESSIONS]: sessions
        });
      }
    } catch (error) {
      if (error instanceof SessionNotFoundError || error instanceof ValidationError) {
        throw error;
      }
      throw new StorageError(`Failed to update session: ${error.message}`, error);
    }
  }

  /**
   * Stops a recording session and prepares it for export
   * @param {string} sessionId - Session to stop
   * @returns {Promise<RecordingSession>}
   * @throws {SessionNotFoundError} if session doesn't exist
   * @throws {StorageError} if storage operation fails
   */
  async stopSession(sessionId) {
    try {
      const activeSession = await this.getActiveSession();
      
      if (!activeSession || activeSession.sessionId !== sessionId) {
        throw new SessionNotFoundError(sessionId);
      }

      if (activeSession.status === 'stopped') {
        throw new ValidationError('Session is already stopped');
      }

      // Update session to stopped
      activeSession.toStopped();

      // Move to sessions archive
      const sessions = await this._getSessions();
      sessions.unshift(activeSession.toJSON());
      
      await chrome.storage.local.set({
        [this.STORAGE_KEYS.SESSIONS]: sessions,
        [this.STORAGE_KEYS.ACTIVE_SESSION]: null
      });

      return activeSession;
    } catch (error) {
      if (error instanceof SessionNotFoundError || error instanceof ValidationError) {
        throw error;
      }
      throw new StorageError(`Failed to stop session: ${error.message}`, error);
    }
  }

  /**
   * Retrieves a specific session by ID
   * @param {string} sessionId - Session identifier
   * @returns {Promise<RecordingSession|null>}
   * @throws {StorageError} if storage operation fails
   */
  async getSession(sessionId) {
    try {
      // Check active session
      const activeSession = await this.getActiveSession();
      if (activeSession && activeSession.sessionId === sessionId) {
        return activeSession;
      }

      // Check archived sessions
      const sessions = await this._getSessions();
      const sessionData = sessions.find(s => s.sessionId === sessionId);
      
      if (!sessionData) {
        return null;
      }
      
      return RecordingSession.fromJSON(sessionData);
    } catch (error) {
      throw new StorageError(`Failed to get session: ${error.message}`, error);
    }
  }

  /**
   * Lists recent sessions in reverse chronological order
   * @param {number} limit - Maximum sessions to return (default: 10)
   * @returns {Promise<RecordingSession[]>}
   * @throws {ValidationError} if limit < 1
   * @throws {StorageError} if storage operation fails
   */
  async listSessions(limit = 10) {
    try {
      if (limit < 1) {
        throw new ValidationError('Limit must be at least 1');
      }

      const sessions = await this._getSessions();
      
      // Sort by startTime (newest first) and limit
      return sessions
        .slice(0, limit)
        .map(data => RecordingSession.fromJSON(data));
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new StorageError(`Failed to list sessions: ${error.message}`, error);
    }
  }

  /**
   * Permanently removes a session
   * @param {string} sessionId - Session to delete
   * @returns {Promise<void>}
   * @throws {SessionNotFoundError} if session doesn't exist
   * @throws {ActiveSessionExistsError} if trying to delete active session
   * @throws {StorageError} if storage operation fails
   */
  async deleteSession(sessionId) {
    try {
      // Cannot delete active session
      const activeSession = await this.getActiveSession();
      if (activeSession && activeSession.sessionId === sessionId) {
        throw new ActiveSessionExistsError(sessionId);
      }

      const sessions = await this._getSessions();
      const index = sessions.findIndex(s => s.sessionId === sessionId);
      
      if (index === -1) {
        throw new SessionNotFoundError(sessionId);
      }

      const deletedSession = sessions[index];
      sessions.splice(index, 1);
      
      await chrome.storage.local.set({
        [this.STORAGE_KEYS.SESSIONS]: sessions
      });

      // Update stats
      await this._updateStats({
        totalSessions: -1,
        totalEvents: -(deletedSession.events?.length || 0)
      });
    } catch (error) {
      if (error instanceof SessionNotFoundError || error instanceof ActiveSessionExistsError) {
        throw error;
      }
      throw new StorageError(`Failed to delete session: ${error.message}`, error);
    }
  }

  // ============================================================================
  // Event Management
  // ============================================================================

  /**
   * Adds an interaction event to the active session
   * @param {InteractionEvent} event - Event to add
   * @returns {Promise<void>}
   * @throws {NoActiveSessionError} if no session is recording
   * @throws {ValidationError} if event object is invalid
   * @throws {QuotaExceededError} if approaching storage limits
   * @throws {StorageError} if storage operation fails
   */
  async addEvent(event) {
    try {
      if (!(event instanceof InteractionEvent)) {
        throw new ValidationError('Invalid event object');
      }

      const activeSession = await this.getActiveSession();
      
      if (!activeSession) {
        throw new NoActiveSessionError();
      }

      if (activeSession.status !== 'recording') {
        throw new ValidationError('Session is not recording');
      }

      // Check storage quota
      const stats = await this.getStorageStats();
      if (stats.quotaUsagePercent > 80) {
        throw new QuotaExceededError('Storage quota nearly exceeded');
      }

      // Add event to session
      activeSession.addEvent(event.toJSON());

      // Update session
      await chrome.storage.local.set({
        [this.STORAGE_KEYS.ACTIVE_SESSION]: activeSession.toJSON()
      });

      // Update stats
      await this._updateStats({ totalEvents: 1 });
    } catch (error) {
      if (error instanceof NoActiveSessionError || 
          error instanceof ValidationError || 
          error instanceof QuotaExceededError) {
        throw error;
      }
      throw new StorageError(`Failed to add event: ${error.message}`, error);
    }
  }

  /**
   * Retrieves all events for a session
   * @param {string} sessionId - Session identifier
   * @returns {Promise<InteractionEvent[]>}
   * @throws {SessionNotFoundError} if session doesn't exist
   * @throws {StorageError} if storage operation fails
   */
  async getEvents(sessionId) {
    try {
      const session = await this.getSession(sessionId);
      
      if (!session) {
        throw new SessionNotFoundError(sessionId);
      }

      return session.events.map(data => InteractionEvent.fromJSON(data));
    } catch (error) {
      if (error instanceof SessionNotFoundError) {
        throw error;
      }
      throw new StorageError(`Failed to get events: ${error.message}`, error);
    }
  }

  // ============================================================================
  // Configuration Management
  // ============================================================================

  /**
   * Retrieves current event configuration
   * @returns {Promise<EventConfiguration>}
   * @throws {StorageError} if storage operation fails
   */
  async getConfig() {
    try {
      const result = await chrome.storage.local.get(this.STORAGE_KEYS.CONFIG);
      const data = result[this.STORAGE_KEYS.CONFIG];
      
      if (!data) {
        return EventConfiguration.createDefault();
      }
      
      return EventConfiguration.fromJSON(data);
    } catch (error) {
      throw new StorageError(`Failed to get config: ${error.message}`, error);
    }
  }

  /**
   * Updates event configuration settings
   * @param {EventConfiguration} config - New configuration
   * @returns {Promise<void>}
   * @throws {ValidationError} if config object is invalid
   * @throws {StorageError} if storage operation fails
   */
  async updateConfig(config) {
    try {
      if (!(config instanceof EventConfiguration)) {
        throw new ValidationError('Invalid configuration object');
      }

      await chrome.storage.local.set({
        [this.STORAGE_KEYS.CONFIG]: config.toJSON()
      });

      // Notify content scripts if recording active
      const activeSession = await this.getActiveSession();
      if (activeSession && activeSession.status === 'recording') {
        await this._notifyConfigChange(config);
      }
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new StorageError(`Failed to update config: ${error.message}`, error);
    }
  }

  /**
   * Resets configuration to default values
   * @returns {Promise<EventConfiguration>}
   * @throws {StorageError} if storage operation fails
   */
  async resetConfig() {
    try {
      const defaultConfig = EventConfiguration.createDefault();
      
      await chrome.storage.local.set({
        [this.STORAGE_KEYS.CONFIG]: defaultConfig.toJSON()
      });

      // Notify content scripts if recording active
      const activeSession = await this.getActiveSession();
      if (activeSession && activeSession.status === 'recording') {
        await this._notifyConfigChange(defaultConfig);
      }

      return defaultConfig;
    } catch (error) {
      throw new StorageError(`Failed to reset config: ${error.message}`, error);
    }
  }

  // ============================================================================
  // Storage Management
  // ============================================================================

  /**
   * Retrieves storage usage statistics
   * @returns {Promise<Object>} StorageStats
   * @throws {StorageError} if storage operation fails
   */
  async getStorageStats() {
    try {
      const result = await chrome.storage.local.get(this.STORAGE_KEYS.STATS);
      let stats = result[this.STORAGE_KEYS.STATS];
      
      if (!stats) {
        stats = {
          totalSessions: 0,
          totalEvents: 0,
          estimatedBytes: 0,
          lastCleanup: null,
          quotaUsagePercent: 0
        };
      }

      // Get actual storage usage
      const bytesInUse = await chrome.storage.local.getBytesInUse();
      const quota = chrome.storage.local.QUOTA_BYTES || 10485760; // 10MB default
      
      stats.estimatedBytes = bytesInUse;
      stats.quotaUsagePercent = (bytesInUse / quota) * 100;

      return stats;
    } catch (error) {
      throw new StorageError(`Failed to get storage stats: ${error.message}`, error);
    }
  }

  /**
   * Removes old sessions to free storage space
   * @returns {Promise<Object>} CleanupResult
   * @throws {StorageError} if storage operation fails
   */
  async cleanup() {
    try {
      const sessions = await this._getSessions();
      const keepCount = 10;
      
      if (sessions.length <= keepCount) {
        return {
          sessionsDeleted: 0,
          eventsDeleted: 0,
          bytesFreed: 0
        };
      }

      // Keep only the most recent sessions
      const toDelete = sessions.slice(keepCount);
      const toKeep = sessions.slice(0, keepCount);
      
      let eventsDeleted = 0;
      toDelete.forEach(session => {
        eventsDeleted += session.events?.length || 0;
      });

      const bytesBefore = await chrome.storage.local.getBytesInUse();
      
      await chrome.storage.local.set({
        [this.STORAGE_KEYS.SESSIONS]: toKeep
      });

      const bytesAfter = await chrome.storage.local.getBytesInUse();

      // Update stats
      await this._updateStats({
        totalSessions: -toDelete.length,
        totalEvents: -eventsDeleted,
        lastCleanup: new Date().toISOString()
      });

      return {
        sessionsDeleted: toDelete.length,
        eventsDeleted: eventsDeleted,
        bytesFreed: bytesBefore - bytesAfter
      };
    } catch (error) {
      throw new StorageError(`Failed to cleanup: ${error.message}`, error);
    }
  }

  /**
   * Permanently removes all sessions and resets configuration
   * @returns {Promise<void>}
   * @throws {StorageError} if storage operation fails
   */
  async clearAllData() {
    try {
      await chrome.storage.local.clear();
      
      // Reset to defaults
      const defaultConfig = EventConfiguration.createDefault();
      await chrome.storage.local.set({
        [this.STORAGE_KEYS.CONFIG]: defaultConfig.toJSON(),
        [this.STORAGE_KEYS.SESSIONS]: [],
        [this.STORAGE_KEYS.STATS]: {
          totalSessions: 0,
          totalEvents: 0,
          estimatedBytes: 0,
          lastCleanup: new Date().toISOString(),
          quotaUsagePercent: 0
        }
      });
    } catch (error) {
      throw new StorageError(`Failed to clear all data: ${error.message}`, error);
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Get all archived sessions
   * @private
   * @returns {Promise<Array>}
   */
  async _getSessions() {
    const result = await chrome.storage.local.get(this.STORAGE_KEYS.SESSIONS);
    return result[this.STORAGE_KEYS.SESSIONS] || [];
  }

  /**
   * Update storage statistics
   * @private
   * @param {Object} delta - Changes to apply
   * @returns {Promise<void>}
   */
  async _updateStats(delta) {
    const stats = await this.getStorageStats();
    
    if (delta.totalSessions !== undefined) {
      stats.totalSessions = Math.max(0, stats.totalSessions + delta.totalSessions);
    }
    if (delta.totalEvents !== undefined) {
      stats.totalEvents = Math.max(0, stats.totalEvents + delta.totalEvents);
    }
    if (delta.lastCleanup !== undefined) {
      stats.lastCleanup = delta.lastCleanup;
    }

    await chrome.storage.local.set({
      [this.STORAGE_KEYS.STATS]: stats
    });
  }

  /**
   * Notify content scripts of configuration changes
   * @private
   * @param {EventConfiguration} config
   * @returns {Promise<void>}
   */
  async _notifyConfigChange(config) {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      try {
        await chrome.tabs.sendMessage(tab.id, {
          type: 'CONFIG_UPDATED',
          config: config.toJSON()
        });
      } catch (error) {
        // Ignore errors for tabs that don't have content script
      }
    }
  }

  /**
   * Generate UUID v4
   * @private
   * @returns {string}
   */
  _generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}
