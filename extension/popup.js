// Update the status in the popup
function updateStatus(result) {
    const statusDiv = document.getElementById('status');
    const confidenceDiv = document.getElementById('confidence');
    const errorDiv = document.getElementById('error');
    
    // Clear any previous error
    errorDiv.textContent = '';
    
    if (result.isFake) {
        statusDiv.className = 'status fake';
        statusDiv.textContent = '⚠️ Fake News Detected';
    } else {
        statusDiv.className = 'status real';
        statusDiv.textContent = '✅ Likely Real News';
    }
    
    // Show confidence score
    const confidence = (result.confidence * 100).toFixed(1);
    confidenceDiv.textContent = `Confidence: ${confidence}%`;
}

// Show error message
function showError(message) {
    const statusDiv = document.getElementById('status');
    const errorDiv = document.getElementById('error');
    const confidenceDiv = document.getElementById('confidence');
    
    statusDiv.textContent = '❌ Analysis Failed';
    statusDiv.className = 'status';
    errorDiv.textContent = message;
    confidenceDiv.textContent = '';
}

// Get the current tab and analyze it
chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    const currentTab = tabs[0];
    
    // Send message to content script to analyze the page
    chrome.tabs.sendMessage(currentTab.id, {action: 'getAnalysis'}, function(response) {
        if (chrome.runtime.lastError) {
            showError('Please refresh the page and try again');
            return;
        }
        
        if (response && response.result) {
            updateStatus(response.result);
        } else {
            showError('No article content found on this page');
        }
    });
}); 