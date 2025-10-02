/**
 * Error Types
 * Custom error classes for the DOM Interaction Recorder Extension
 * Based on contracts/storage-service.md Error Types section
 */

/**
 * Base error class for storage-related errors
 */
export class StorageError extends Error {
  constructor(message) {
    super(message);
    this.name = 'StorageError';
  }
}

/**
 * Error thrown when a session is not found
 */
export class SessionNotFoundError extends Error {
  constructor(sessionId) {
    super(`Session not found: ${sessionId}`);
    this.name = 'SessionNotFoundError';
    this.sessionId = sessionId;
  }
}

/**
 * Error thrown when validation fails
 */
export class ValidationError extends Error {
  constructor(message, field = null) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

/**
 * Error thrown when export fails
 */
export class ExportError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ExportError';
  }
}

/**
 * Error thrown when quota is exceeded
 */
export class QuotaExceededError extends StorageError {
  constructor(message = 'Storage quota exceeded') {
    super(message);
    this.name = 'QuotaExceededError';
  }
}

/**
 * Error thrown when an active session already exists
 */
export class ActiveSessionExistsError extends Error {
  constructor(sessionId) {
    super(`An active session already exists: ${sessionId}`);
    this.name = 'ActiveSessionExistsError';
    this.sessionId = sessionId;
  }
}

/**
 * Error thrown when no active session exists
 */
export class NoActiveSessionError extends Error {
  constructor(message = 'No active session found') {
    super(message);
    this.name = 'NoActiveSessionError';
  }
}

/**
 * Error thrown when configuration is invalid
 */
export class ConfigurationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

/**
 * Error thrown when event processing fails
 */
export class EventProcessingError extends Error {
  constructor(message) {
    super(message);
    this.name = 'EventProcessingError';
  }
}
