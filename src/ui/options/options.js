/**
 * Options Page JavaScript
 * Settings for event type customization
 */

// UI Elements
const eventCheckboxes = {
  click: document.getElementById('event-click'),
  dblclick: document.getElementById('event-dblclick'),
  keypress: document.getElementById('event-keypress'),
  hover: document.getElementById('event-hover'),
  scroll: document.getElementById('event-scroll'),
  focus: document.getElementById('event-focus'),
  blur: document.getElementById('event-blur'),
  navigation: document.getElementById('event-navigation')
};

const maxDOMDepthInput = document.getElementById('max-dom-depth');
const maxSiblingsInput = document.getElementById('max-siblings');
const domDepthValue = document.getElementById('dom-depth-value');
const siblingsValue = document.getElementById('siblings-value');
const saveBtn = document.getElementById('save-btn');
const resetBtn = document.getElementById('reset-btn');
const statusMessage = document.getElementById('status-message');

// Initialize
async function initialize() {
  await loadSettings();
  
  // Set up event listeners
  saveBtn.addEventListener('click', handleSave);
  resetBtn.addEventListener('click', handleReset);
  
  // Update range value displays
  maxDOMDepthInput.addEventListener('input', () => {
    domDepthValue.textContent = maxDOMDepthInput.value;
  });
  
  maxSiblingsInput.addEventListener('input', () => {
    siblingsValue.textContent = maxSiblingsInput.value;
  });
}

// Load settings from storage
async function loadSettings() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_CONFIG' });
    
    if (!response.success) {
      showStatus('Failed to load settings', 'error');
      return;
    }

    const config = response.data.config;

    // Update checkboxes
    Object.keys(eventCheckboxes).forEach(eventType => {
      eventCheckboxes[eventType].checked = config.enabledEventTypes.includes(eventType);
    });

    // Update range inputs
    maxDOMDepthInput.value = config.maxDOMDepth;
    maxSiblingsInput.value = config.maxSiblings;
    domDepthValue.textContent = config.maxDOMDepth;
    siblingsValue.textContent = config.maxSiblings;

  } catch (error) {
    console.error('Failed to load settings:', error);
    showStatus('Failed to load settings', 'error');
  }
}

// Handle save button
async function handleSave() {
  try {
    // Collect enabled event types
    const enabledEventTypes = [];
    Object.entries(eventCheckboxes).forEach(([eventType, checkbox]) => {
      if (checkbox.checked) {
        enabledEventTypes.push(eventType);
      }
    });

    // Validate at least one event type is enabled
    if (enabledEventTypes.length === 0) {
      showStatus('At least one event type must be enabled', 'error');
      return;
    }

    // Build config object
    const config = {
      enabledEventTypes: enabledEventTypes,
      maxDOMDepth: parseInt(maxDOMDepthInput.value),
      maxSiblings: parseInt(maxSiblingsInput.value)
    };

    // Save to storage
    const response = await chrome.runtime.sendMessage({
      type: 'UPDATE_CONFIG',
      config: config
    });

    if (response.success) {
      showStatus('Settings saved successfully!', 'success');
    } else {
      showStatus('Failed to save settings: ' + response.error, 'error');
    }

  } catch (error) {
    console.error('Failed to save settings:', error);
    showStatus('Failed to save settings', 'error');
  }
}

// Handle reset button
async function handleReset() {
  try {
    const confirmed = confirm('Are you sure you want to reset all settings to defaults?');
    
    if (!confirmed) return;

    const response = await chrome.runtime.sendMessage({ type: 'RESET_CONFIG' });

    if (response.success) {
      await loadSettings();
      showStatus('Settings reset to defaults', 'success');
    } else {
      showStatus('Failed to reset settings: ' + response.error, 'error');
    }

  } catch (error) {
    console.error('Failed to reset settings:', error);
    showStatus('Failed to reset settings', 'error');
  }
}

// Show status message
function showStatus(message, type) {
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type}`;
  
  // Hide after 3 seconds
  setTimeout(() => {
    statusMessage.className = 'status-message';
  }, 3000);
}

// Initialize on load
initialize();
