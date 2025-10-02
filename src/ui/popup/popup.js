/**
 * Popup UI JavaScript
 * Controls for recording sessions
 */

// UI Elements
const recordBtn = document.getElementById('record-btn');
const pauseBtn = document.getElementById('pause-btn');
const resumeBtn = document.getElementById('resume-btn');
const stopBtn = document.getElementById('stop-btn');
const statusIndicator = document.getElementById('status-indicator');
const statusText = document.getElementById('status-text');
const eventCountValue = document.getElementById('event-count-value');
const viewLogsBtn = document.getElementById('view-logs-btn');
const settingsBtn = document.getElementById('settings-btn');

// Initialize
async function initialize() {
  await updateUI();
  
  // Set up event listeners
  recordBtn.addEventListener('click', handleRecord);
  pauseBtn.addEventListener('click', handlePause);
  resumeBtn.addEventListener('click', handleResume);
  stopBtn.addEventListener('click', handleStop);
  viewLogsBtn.addEventListener('click', handleViewLogs);
  settingsBtn.addEventListener('click', handleSettings);
  
  // Listen for storage changes to update event count in real-time
  chrome.storage.onChanged.addListener(handleStorageChange);
  
  // Listen for messages from background to update UI in real-time
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'EVENT_ADDED') {
      updateUI();
    }
    sendResponse({ success: true });
  });
}

// Update UI based on current session status
async function updateUI() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_SESSION_STATUS' });
    
    if (!response.success) {
      console.error('Failed to get session status');
      return;
    }

    const { status, session } = response.data;

    // Update status indicator
    statusIndicator.className = `status ${status}`;
    
    if (status === 'stopped') {
      statusText.textContent = 'Stopped';
      recordBtn.disabled = false;
      pauseBtn.disabled = true;
      pauseBtn.style.display = 'flex';
      resumeBtn.disabled = true;
      resumeBtn.style.display = 'none';
      stopBtn.disabled = true;
    } else if (status === 'recording') {
      statusText.textContent = 'Recording';
      recordBtn.disabled = true;
      pauseBtn.disabled = false;
      pauseBtn.style.display = 'flex';
      resumeBtn.disabled = true;
      resumeBtn.style.display = 'none';
      stopBtn.disabled = false;
    } else if (status === 'paused') {
      statusText.textContent = 'Paused';
      recordBtn.disabled = true;
      pauseBtn.disabled = true;
      pauseBtn.style.display = 'none';
      resumeBtn.disabled = false;
      resumeBtn.style.display = 'flex';
      stopBtn.disabled = false;
    }

    // Update event count
    if (session) {
      eventCountValue.textContent = session.metadata.totalEvents || 0;
    } else {
      eventCountValue.textContent = '0';
    }
  } catch (error) {
    console.error('Failed to update UI:', error);
  }
}

// Handle record button
async function handleRecord() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'START_RECORDING' });
    
    if (response.success) {
      await updateUI();
    } else {
      alert('Failed to start recording: ' + response.error);
    }
  } catch (error) {
    console.error('Failed to start recording:', error);
    alert('Failed to start recording');
  }
}

// Handle pause button
async function handlePause() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'PAUSE_RECORDING' });
    
    if (response.success) {
      await updateUI();
    } else {
      alert('Failed to pause recording: ' + response.error);
    }
  } catch (error) {
    console.error('Failed to pause recording:', error);
    alert('Failed to pause recording');
  }
}

// Handle resume button
async function handleResume() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'RESUME_RECORDING' });
    
    if (response.success) {
      await updateUI();
    } else {
      alert('Failed to resume recording: ' + response.error);
    }
  } catch (error) {
    console.error('Failed to resume recording:', error);
    alert('Failed to resume recording');
  }
}

// Handle stop button
async function handleStop() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'STOP_RECORDING' });
    
    if (response.success) {
      await updateUI();
      
      // Show export result
      if (response.data.export && response.data.export.success) {
        alert(`Recording stopped and exported!\nFile: ${response.data.export.filename}\nEvents: ${response.data.export.eventCount}`);
      } else {
        alert('Recording stopped. Export failed: ' + (response.data.export?.error || 'Unknown error'));
      }
    } else {
      alert('Failed to stop recording: ' + response.error);
    }
  } catch (error) {
    console.error('Failed to stop recording:', error);
    alert('Failed to stop recording');
  }
}

// Handle view logs button
function handleViewLogs() {
  chrome.sidePanel.open();
}

// Handle settings button
function handleSettings() {
  chrome.runtime.openOptionsPage();
}

// Handle storage changes (real-time updates)
function handleStorageChange(changes, area) {
  if (area === 'local') {
    updateUI();
  }
}

// Initialize on load
initialize();
