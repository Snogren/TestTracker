/**
 * Sidepanel UI JavaScript
 * Displays event logs in chronological order
 */

// UI Elements
const sessionIdEl = document.getElementById('session-id');
const sessionStatusEl = document.getElementById('session-status');
const totalEventsEl = document.getElementById('total-events');
const eventsContainer = document.getElementById('events-container');
const refreshBtn = document.getElementById('refresh-btn');

let currentSessionId = null;

// Initialize
async function initialize() {
  await loadEvents();
  
  // Set up refresh button
  refreshBtn.addEventListener('click', loadEvents);
  
  // Listen for storage changes for real-time updates
  chrome.storage.onChanged.addListener(handleStorageChange);
  
  // Refresh every 2 seconds if recording
  setInterval(async () => {
    const response = await chrome.runtime.sendMessage({ type: 'GET_SESSION_STATUS' });
    if (response.success && response.data.status === 'recording') {
      await loadEvents();
    }
  }, 2000);
}

// Load events from active session
async function loadEvents() {
  try {
    // Get current session status
    const statusResponse = await chrome.runtime.sendMessage({ type: 'GET_SESSION_STATUS' });
    
    if (!statusResponse.success) {
      console.error('Failed to get session status');
      return;
    }

    const { status, session } = statusResponse.data;

    if (!session) {
      // No session
      sessionIdEl.textContent = '-';
      sessionStatusEl.textContent = '-';
      totalEventsEl.textContent = '0';
      eventsContainer.innerHTML = '<p class="empty-message">No events captured yet. Start recording to see interaction logs.</p>';
      return;
    }

    // Update session info
    currentSessionId = session.sessionId;
    sessionIdEl.textContent = session.sessionId.substring(0, 8) + '...';
    sessionStatusEl.textContent = status;
    totalEventsEl.textContent = session.metadata.totalEvents || 0;

    // Load events
    const eventsResponse = await chrome.runtime.sendMessage({
      type: 'GET_EVENTS',
      sessionId: session.sessionId
    });

    if (!eventsResponse.success) {
      console.error('Failed to load events');
      return;
    }

    const events = eventsResponse.data.events;

    if (events.length === 0) {
      eventsContainer.innerHTML = '<p class="empty-message">No events in this session yet.</p>';
      return;
    }

    // Display events
    displayEvents(events);
  } catch (error) {
    console.error('Failed to load events:', error);
  }
}

// Display events in chronological order
function displayEvents(events) {
  eventsContainer.innerHTML = '';

  events.forEach((event, index) => {
    const card = createEventCard(event, index);
    eventsContainer.appendChild(card);
  });
}

// Create event card element
function createEventCard(event, index) {
  const card = document.createElement('div');
  card.className = 'event-card';

  const timestamp = new Date(event.timestamp).toLocaleString();
  const rollupBadge = event.eventCount && event.eventCount > 1 
    ? `<span class="event-rollup">×${event.eventCount}</span>` 
    : '';

  card.innerHTML = `
    <div class="event-header">
      <span class="event-type">${event.interactionType}${rollupBadge}</span>
      <span class="event-timestamp">${timestamp}</span>
    </div>
    <div class="event-details">
      <p><strong>Page:</strong> ${escapeHtml(event.pageTitle)}</p>
      <p><strong>URL:</strong> ${escapeHtml(event.url)}</p>
      <p><strong>Element:</strong> ${escapeHtml(event.elementDetails.tagName)}</p>
      ${event.textInput ? `<p><strong>Text Input:</strong> ${escapeHtml(event.textInput)}</p>` : ''}
    </div>
    ${event.annotation ? `<div class="event-annotation">${escapeHtml(event.annotation)}</div>` : ''}
    <div class="event-selector">${escapeHtml(event.elementDetails.selector)}</div>
  `;

  return card;
}

// Handle storage changes for real-time updates
function handleStorageChange(changes, area) {
  if (area === 'local' && changes.activeSession) {
    loadEvents();
  }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Initialize on load
initialize();
