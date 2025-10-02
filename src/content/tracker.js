/**
 * DOM Tracker Content Script
 * Captures user interactions and sends them to background service worker
 * Based on research.md Section 2 (Event Capture Strategy)
 */

// Track recording state
let isRecording = false;
let isPaused = false;
let currentSessionId = null;

// Track rollup state
let lastAcceptedEvent = null;
let contextBroken = false;
let currentConfig = null;

// Initialize
async function initialize() {
  try {
    // Get current session status
    const response = await chrome.runtime.sendMessage({ type: 'GET_SESSION_STATUS' });
    if (response.success && response.data.session) {
      isRecording = response.data.status === 'recording';
      isPaused = response.data.status === 'paused';
      currentSessionId = response.data.session.sessionId;
    }

    // Get configuration
    const configResponse = await chrome.runtime.sendMessage({ type: 'GET_CONFIG' });
    if (configResponse.success) {
      currentConfig = configResponse.data.config;
    }

    // Set up event listeners if recording
    if (isRecording) {
      setupEventListeners();
    }

    console.log('DOM Tracker content script initialized');
  } catch (error) {
    console.error('Failed to initialize DOM Tracker:', error);
  }
}

// Listen for messages from background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'RECORDING_STARTED':
      isRecording = true;
      isPaused = false;
      currentSessionId = message.sessionId;
      setupEventListeners();
      break;
    
    case 'RECORDING_PAUSED':
      isPaused = true;
      break;
    
    case 'RECORDING_RESUMED':
      isPaused = false;
      break;
    
    case 'RECORDING_STOPPED':
      isRecording = false;
      isPaused = false;
      currentSessionId = null;
      removeEventListeners();
      break;
    
    case 'CONFIG_UPDATED':
      currentConfig = message.config;
      if (isRecording) {
        // Reapply event listeners with new config
        removeEventListeners();
        setupEventListeners();
      }
      break;
  }
  
  sendResponse({ success: true });
});

// ============================================================================
// Event Listener Setup
// ============================================================================

const eventListeners = {};

function setupEventListeners() {
  if (!currentConfig) return;

  // Click events
  if (currentConfig.enabledEventTypes.includes('click')) {
    eventListeners.click = handleClick;
    document.addEventListener('click', eventListeners.click, true);
  }

  // Double-click events
  if (currentConfig.enabledEventTypes.includes('dblclick')) {
    eventListeners.dblclick = handleDblClick;
    document.addEventListener('dblclick', eventListeners.dblclick, true);
  }

  // Keypress events
  if (currentConfig.enabledEventTypes.includes('keypress')) {
    eventListeners.keydown = handleKeypress;
    document.addEventListener('keydown', eventListeners.keydown, true);
  }

  // Focus events
  if (currentConfig.enabledEventTypes.includes('focus')) {
    eventListeners.focus = handleFocus;
    document.addEventListener('focus', eventListeners.focus, true);
  }

  // Blur events
  if (currentConfig.enabledEventTypes.includes('blur')) {
    eventListeners.blur = handleBlur;
    document.addEventListener('blur', eventListeners.blur, true);
  }

  // Scroll events
  if (currentConfig.enabledEventTypes.includes('scroll')) {
    eventListeners.scroll = handleScroll;
    document.addEventListener('scroll', eventListeners.scroll, true);
  }

  // Hover events (mouseover)
  if (currentConfig.enabledEventTypes.includes('hover')) {
    eventListeners.mouseover = handleHover;
    document.addEventListener('mouseover', eventListeners.mouseover, true);
  }

  // Navigation events
  if (currentConfig.enabledEventTypes.includes('navigation')) {
    setupNavigationTracking();
  }

  console.log('Event listeners set up for:', currentConfig.enabledEventTypes);
}

function removeEventListeners() {
  Object.entries(eventListeners).forEach(([type, handler]) => {
    document.removeEventListener(type, handler, true);
  });
  Object.keys(eventListeners).forEach(key => delete eventListeners[key]);
}

// ============================================================================
// Event Handlers
// ============================================================================

async function handleClick(event) {
  if (!isRecording || isPaused) return;
  if (shouldIgnoreElement(event.target)) return;

  await captureEvent('click', event.target, event);
}

async function handleDblClick(event) {
  if (!isRecording || isPaused) return;
  if (shouldIgnoreElement(event.target)) return;

  await captureEvent('dblclick', event.target, event);
}

async function handleKeypress(event) {
  if (!isRecording || isPaused) return;
  if (shouldIgnoreElement(event.target)) return;

  // Capture special keys
  const specialKeys = {
    'Enter': 'ENTER',
    'Tab': 'TAB',
    'Backspace': 'BACKSPACE',
    'Escape': 'ESCAPE',
    'ArrowUp': 'ARROW_UP',
    'ArrowDown': 'ARROW_DOWN',
    'ArrowLeft': 'ARROW_LEFT',
    'ArrowRight': 'ARROW_RIGHT'
  };

  let textInput = '';
  if (specialKeys[event.key]) {
    textInput = `[${specialKeys[event.key]}]`;
  } else if (event.key.length === 1) {
    textInput = event.key;
  }

  if (textInput) {
    await captureEvent('keypress', event.target, event, textInput);
  }
}

async function handleFocus(event) {
  if (!isRecording || isPaused) return;
  if (shouldIgnoreElement(event.target)) return;

  // Focus is a break event
  contextBroken = true;
  await captureEvent('focus', event.target, event);
}

async function handleBlur(event) {
  if (!isRecording || isPaused) return;
  if (shouldIgnoreElement(event.target)) return;

  // Blur is a break event
  contextBroken = true;
  await captureEvent('blur', event.target, event);
}

async function handleScroll(event) {
  if (!isRecording || isPaused) return;
  
  // Debounce scroll events
  clearTimeout(handleScroll.timeout);
  handleScroll.timeout = setTimeout(async () => {
    const target = event.target === document ? document.documentElement : event.target;
    if (shouldIgnoreElement(target)) return;
    
    await captureEvent('scroll', target, event);
  }, 500);
}

async function handleHover(event) {
  if (!isRecording || isPaused) return;
  if (shouldIgnoreElement(event.target)) return;

  // Debounce hover events
  clearTimeout(handleHover.timeout);
  handleHover.timeout = setTimeout(async () => {
    await captureEvent('hover', event.target, event);
  }, 1000);
}

// ============================================================================
// Navigation Tracking
// ============================================================================

let lastUrl = window.location.href;

function setupNavigationTracking() {
  // Track URL changes
  setInterval(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      if (isRecording && !isPaused) {
        captureNavigationEvent();
      }
    }
  }, 500);

  // Track history API
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;

  history.pushState = function(...args) {
    originalPushState.apply(this, args);
    if (isRecording && !isPaused) {
      captureNavigationEvent();
    }
  };

  history.replaceState = function(...args) {
    originalReplaceState.apply(this, args);
    if (isRecording && !isPaused) {
      captureNavigationEvent();
    }
  };
}

async function captureNavigationEvent() {
  // Navigation is a break event
  contextBroken = true;
  
  // Use document.body as the target for navigation events
  await captureEvent('navigation', document.body, null);
}

// ============================================================================
// Event Capture
// ============================================================================

async function captureEvent(eventType, element, domEvent, textInput = null) {
  try {
    // Check if element should be ignored
    if (shouldIgnoreElement(element)) return;

    // Extract element details (simplified for content script)
    const rawEvent = {
      eventType: eventType,
      element: element,
      timestamp: new Date(),
      pageTitle: document.title,
      pageUrl: window.location.href,
      textInput: textInput
    };

    // Show annotation UI and wait for user decision
    const annotation = await showAnnotationUI(rawEvent);
    
    if (annotation === null) {
      // User rejected the event
      return;
    }

    // Create event object with annotation
    const event = await createInteractionEvent(rawEvent, annotation);

    // Send to background service
    await chrome.runtime.sendMessage({
      type: 'ADD_EVENT',
      event: event
    });

    // Update rollup state
    lastAcceptedEvent = event;
    contextBroken = false;

  } catch (error) {
    console.error('Failed to capture event:', error);
  }
}

// ============================================================================
// Annotation UI
// ============================================================================

async function showAnnotationUI(rawEvent) {
  return new Promise((resolve, reject) => {
    // Create accept/reject overlay
    const overlay = document.createElement('div');
    overlay.className = 'dom-tracker-annotation-overlay';
    overlay.innerHTML = `
      <div class="dom-tracker-accept-reject">
        <p>Capture this interaction?</p>
        <button class="dom-tracker-accept" autofocus>Accept</button>
        <button class="dom-tracker-reject">Reject</button>
      </div>
    `;
    
    document.body.appendChild(overlay);

    const acceptBtn = overlay.querySelector('.dom-tracker-accept');
    const rejectBtn = overlay.querySelector('.dom-tracker-reject');

    // Auto-focus accept button
    acceptBtn.focus();

    // Handle accept
    acceptBtn.addEventListener('click', async () => {
      document.body.removeChild(overlay);
      
      // Show annotation input
      const annotation = await showAnnotationInput();
      resolve(annotation);
    });

    // Handle reject
    rejectBtn.addEventListener('click', () => {
      document.body.removeChild(overlay);
      resolve(null);
    });

    // Handle keyboard
    overlay.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter' && document.activeElement === acceptBtn) {
        document.body.removeChild(overlay);
        const annotation = await showAnnotationInput();
        resolve(annotation);
      } else if (e.key === 'Enter' && document.activeElement === rejectBtn) {
        document.body.removeChild(overlay);
        resolve(null);
      } else if (e.key === 'Escape') {
        document.body.removeChild(overlay);
        resolve(null);
      }
    });
  });
}

async function showAnnotationInput() {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'dom-tracker-annotation-overlay';
    overlay.innerHTML = `
      <div class="dom-tracker-annotation-input">
        <p>Add annotation (optional):</p>
        <input type="text" class="dom-tracker-input" placeholder="Describe this interaction..." autofocus />
        <button class="dom-tracker-save">Save</button>
        <button class="dom-tracker-skip">Skip</button>
      </div>
    `;
    
    document.body.appendChild(overlay);

    const input = overlay.querySelector('.dom-tracker-input');
    const saveBtn = overlay.querySelector('.dom-tracker-save');
    const skipBtn = overlay.querySelector('.dom-tracker-skip');

    // Auto-focus input
    input.focus();

    // Handle save
    saveBtn.addEventListener('click', () => {
      const annotation = input.value.trim();
      document.body.removeChild(overlay);
      resolve(annotation);
    });

    // Handle skip
    skipBtn.addEventListener('click', () => {
      document.body.removeChild(overlay);
      resolve('');
    });

    // Handle keyboard
    overlay.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const annotation = input.value.trim();
        document.body.removeChild(overlay);
        resolve(annotation);
      } else if (e.key === 'Escape') {
        document.body.removeChild(overlay);
        resolve('');
      }
    });
  });
}

// Inject annotation CSS
const style = document.createElement('link');
style.rel = 'stylesheet';
style.href = chrome.runtime.getURL('ui/annotation/annotation.css');
document.head.appendChild(style);

// ============================================================================
// Helper Functions
// ============================================================================

function shouldIgnoreElement(element) {
  if (!element) return true;

  // Check if element is part of extension UI
  if (element.classList) {
    for (const cls of element.classList) {
      if (cls.startsWith('dom-tracker-')) {
        return true;
      }
    }
  }

  // Check parents
  let parent = element.parentElement;
  while (parent) {
    if (parent.classList) {
      for (const cls of parent.classList) {
        if (cls.startsWith('dom-tracker-')) {
          return true;
        }
      }
    }
    parent = parent.parentElement;
  }

  return false;
}

async function createInteractionEvent(rawEvent, annotation) {
  // Simplified selector generation
  const selector = generateSimpleSelector(rawEvent.element);
  
  return {
    pageTitle: rawEvent.pageTitle,
    annotation: annotation,
    interactionType: rawEvent.eventType,
    textInput: rawEvent.textInput,
    url: rawEvent.pageUrl,
    elementDetails: {
      html: rawEvent.element.outerHTML.substring(0, 5000),
      selector: selector,
      tagName: rawEvent.element.tagName,
      id: rawEvent.element.id || null,
      classes: Array.from(rawEvent.element.classList || []),
      textContent: (rawEvent.element.textContent || '').substring(0, 1000),
      attributes: extractAttributes(rawEvent.element),
      domContext: extractSimpleDOMContext(rawEvent.element)
    },
    timestamp: rawEvent.timestamp.toISOString(),
    eventCount: null
  };
}

function generateSimpleSelector(element) {
  if (element.id) {
    return `#${element.id}`;
  }
  
  const classes = Array.from(element.classList || []).join('.');
  if (classes) {
    return `${element.tagName.toLowerCase()}.${classes}`;
  }
  
  return element.tagName.toLowerCase();
}

function extractAttributes(element) {
  return {
    type: element.getAttribute('type'),
    name: element.getAttribute('name'),
    value: element.value || null,
    placeholder: element.getAttribute('placeholder'),
    href: element.getAttribute('href'),
    src: element.getAttribute('src')
  };
}

function extractSimpleDOMContext(element) {
  const parents = [];
  let parent = element.parentElement;
  let depth = 0;
  const maxDepth = currentConfig?.maxDOMDepth || 5;

  while (parent && depth < maxDepth && parent !== document.body) {
    parents.push({
      tagName: parent.tagName,
      selector: generateSimpleSelector(parent),
      id: parent.id || null,
      classes: Array.from(parent.classList || [])
    });
    parent = parent.parentElement;
    depth++;
  }

  return {
    parents: parents,
    siblings: {
      previous: element.previousElementSibling?.outerHTML?.substring(0, 500) || null,
      next: element.nextElementSibling?.outerHTML?.substring(0, 500) || null
    },
    xpath: generateSimpleXPath(element)
  };
}

function generateSimpleXPath(element) {
  if (element.id) {
    return `//*[@id="${element.id}"]`;
  }
  
  const parts = [];
  let current = element;

  while (current && current.nodeType === Node.ELEMENT_NODE) {
    const tagName = current.nodeName.toLowerCase();
    parts.unshift(tagName);
    current = current.parentNode;
    
    if (parts.length > 10) break; // Limit depth
  }

  return `/${parts.join('/')}`;
}

// Initialize the content script
initialize();
