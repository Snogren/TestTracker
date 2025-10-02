/**
 * Background Service Worker
 * Coordinates recording sessions, event storage, and export
 * Based on research.md Section 1 (Manifest V3 Architecture)
 */

import { StorageService } from '../services/storage-service.js';
import { ExportService } from '../services/export-service.js';
import { EventProcessorService } from '../services/event-processor.js';

// Initialize services
const storageService = new StorageService();
const exportService = new ExportService(storageService);
const eventProcessor = new EventProcessorService();

// ============================================================================
// Installation and Initialization
// ============================================================================

chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('DOM Tracker Extension installed:', details.reason);
  
  try {
    // Initialize default configuration if first install
    if (details.reason === 'install') {
      const config = await storageService.getConfig();
      console.log('Default configuration initialized:', config);
    }
  } catch (error) {
    console.error('Failed to initialize extension:', error);
  }
});

// ============================================================================
// Message Handlers
// ============================================================================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Message received:', message.type, 'from', sender.tab?.id);

  // Handle async operations
  handleMessage(message, sender)
    .then(response => sendResponse({ success: true, data: response }))
    .catch(error => sendResponse({ success: false, error: error.message }));

  // Return true to indicate async response
  return true;
});

async function handleMessage(message, sender) {
  switch (message.type) {
    // Session Control Messages
    case 'START_RECORDING':
      return await handleStartRecording();
    
    case 'PAUSE_RECORDING':
      return await handlePauseRecording();
    
    case 'RESUME_RECORDING':
      return await handleResumeRecording();
    
    case 'STOP_RECORDING':
      return await handleStopRecording();
    
    case 'GET_SESSION_STATUS':
      return await handleGetSessionStatus();

    // Event Management Messages
    case 'ADD_EVENT':
      return await handleAddEvent(message.event);
    
    case 'GET_EVENTS':
      return await handleGetEvents(message.sessionId);

    // Configuration Messages
    case 'GET_CONFIG':
      return await handleGetConfig();
    
    case 'UPDATE_CONFIG':
      return await handleUpdateConfig(message.config);
    
    case 'RESET_CONFIG':
      return await handleResetConfig();

    // Export Messages
    case 'EXPORT_SESSION':
      return await handleExportSession(message.sessionId);

    // Storage Management Messages
    case 'GET_STORAGE_STATS':
      return await handleGetStorageStats();
    
    case 'CLEANUP_STORAGE':
      return await handleCleanupStorage();
    
    case 'LIST_SESSIONS':
      return await handleListSessions(message.limit);

    default:
      throw new Error(`Unknown message type: ${message.type}`);
  }
}

// ============================================================================
// Session Lifecycle Handlers
// ============================================================================

async function handleStartRecording() {
  try {
    const session = await storageService.createSession();
    
    // Notify all tabs that recording has started
    await notifyAllTabs({
      type: 'RECORDING_STARTED',
      sessionId: session.sessionId
    });

    return { session: session.toJSON() };
  } catch (error) {
    console.error('Failed to start recording:', error);
    throw error;
  }
}

async function handlePauseRecording() {
  try {
    const activeSession = await storageService.getActiveSession();
    
    if (!activeSession) {
      throw new Error('No active recording session');
    }

    activeSession.toPaused();
    await storageService.updateSession(activeSession);

    // Notify all tabs that recording has paused
    await notifyAllTabs({
      type: 'RECORDING_PAUSED',
      sessionId: activeSession.sessionId
    });

    return { session: activeSession.toJSON() };
  } catch (error) {
    console.error('Failed to pause recording:', error);
    throw error;
  }
}

async function handleResumeRecording() {
  try {
    const activeSession = await storageService.getActiveSession();
    
    if (!activeSession) {
      throw new Error('No active recording session');
    }

    activeSession.toRecording();
    await storageService.updateSession(activeSession);

    // Notify all tabs that recording has resumed
    await notifyAllTabs({
      type: 'RECORDING_RESUMED',
      sessionId: activeSession.sessionId
    });

    return { session: activeSession.toJSON() };
  } catch (error) {
    console.error('Failed to resume recording:', error);
    throw error;
  }
}

async function handleStopRecording() {
  try {
    const activeSession = await storageService.getActiveSession();
    
    if (!activeSession) {
      throw new Error('No active recording session');
    }

    const stoppedSession = await storageService.stopSession(activeSession.sessionId);

    // Notify all tabs that recording has stopped
    await notifyAllTabs({
      type: 'RECORDING_STOPPED',
      sessionId: stoppedSession.sessionId
    });

    // Automatically trigger export
    try {
      const exportResult = await exportService.exportSession(stoppedSession.sessionId);
      return { 
        session: stoppedSession.toJSON(),
        export: exportResult
      };
    } catch (exportError) {
      console.error('Failed to export session:', exportError);
      return { 
        session: stoppedSession.toJSON(),
        export: { success: false, error: exportError.message }
      };
    }
  } catch (error) {
    console.error('Failed to stop recording:', error);
    throw error;
  }
}

async function handleGetSessionStatus() {
  try {
    const activeSession = await storageService.getActiveSession();
    
    if (!activeSession) {
      return { status: 'stopped', session: null };
    }

    return { 
      status: activeSession.status,
      session: activeSession.toJSON()
    };
  } catch (error) {
    console.error('Failed to get session status:', error);
    throw error;
  }
}

// ============================================================================
// Event Management Handlers
// ============================================================================

async function handleAddEvent(eventData) {
  try {
    const activeSession = await storageService.getActiveSession();
    
    if (!activeSession || activeSession.status !== 'recording') {
      throw new Error('No active recording session');
    }

    // Process the event
    const config = await storageService.getConfig();
    // Event is already processed by content script, just add it
    await storageService.addEvent(eventData);

    // Notify sidepanel to refresh
    await notifyAllTabs({
      type: 'EVENT_ADDED',
      sessionId: activeSession.sessionId,
      eventCount: activeSession.events.length + 1
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to add event:', error);
    throw error;
  }
}

async function handleGetEvents(sessionId) {
  try {
    const events = await storageService.getEvents(sessionId);
    return { events: events.map(e => e.toJSON()) };
  } catch (error) {
    console.error('Failed to get events:', error);
    throw error;
  }
}

// ============================================================================
// Configuration Handlers
// ============================================================================

async function handleGetConfig() {
  try {
    const config = await storageService.getConfig();
    return { config: config.toJSON() };
  } catch (error) {
    console.error('Failed to get config:', error);
    throw error;
  }
}

async function handleUpdateConfig(configData) {
  try {
    const config = await storageService.getConfig();
    
    // Update config properties
    if (configData.enabledEventTypes) {
      config.enabledEventTypes = configData.enabledEventTypes;
    }
    if (configData.maxDOMDepth !== undefined) {
      config.maxDOMDepth = configData.maxDOMDepth;
    }
    if (configData.maxSiblings !== undefined) {
      config.maxSiblings = configData.maxSiblings;
    }

    await storageService.updateConfig(config);

    return { config: config.toJSON() };
  } catch (error) {
    console.error('Failed to update config:', error);
    throw error;
  }
}

async function handleResetConfig() {
  try {
    const config = await storageService.resetConfig();
    return { config: config.toJSON() };
  } catch (error) {
    console.error('Failed to reset config:', error);
    throw error;
  }
}

// ============================================================================
// Export Handlers
// ============================================================================

async function handleExportSession(sessionId) {
  try {
    const result = await exportService.exportSession(sessionId);
    return result;
  } catch (error) {
    console.error('Failed to export session:', error);
    throw error;
  }
}

// ============================================================================
// Storage Management Handlers
// ============================================================================

async function handleGetStorageStats() {
  try {
    const stats = await storageService.getStorageStats();
    return { stats };
  } catch (error) {
    console.error('Failed to get storage stats:', error);
    throw error;
  }
}

async function handleCleanupStorage() {
  try {
    const result = await storageService.cleanup();
    return result;
  } catch (error) {
    console.error('Failed to cleanup storage:', error);
    throw error;
  }
}

async function handleListSessions(limit = 10) {
  try {
    const sessions = await storageService.listSessions(limit);
    return { sessions: sessions.map(s => s.toJSON()) };
  } catch (error) {
    console.error('Failed to list sessions:', error);
    throw error;
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Notify all tabs with content script
 * @param {Object} message - Message to send
 */
async function notifyAllTabs(message) {
  try {
    const tabs = await chrome.tabs.query({});
    
    for (const tab of tabs) {
      try {
        await chrome.tabs.sendMessage(tab.id, message);
      } catch (error) {
        // Ignore errors for tabs without content script
      }
    }
  } catch (error) {
    console.error('Failed to notify tabs:', error);
  }
}

// ============================================================================
// Storage Change Listener (for real-time updates)
// ============================================================================

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local') {
    // Notify UI components about storage changes
    notifyAllTabs({
      type: 'STORAGE_CHANGED',
      changes: Object.keys(changes)
    });
  }
});

console.log('DOM Tracker Service Worker initialized');
