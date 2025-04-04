// Initialize variables
let lastAnalysis = null;
let pyodideLoaded = false;

// Function to inject the Pyodide loader script
function injectPyodideLoader() {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = chrome.runtime.getURL('pyodide-loader.js');
        script.onload = () => {
            console.log('Pyodide loader script injected');
            resolve();
        };
        script.onerror = (error) => {
            console.error('Error injecting Pyodide loader script:', error);
            reject(error);
        };
        (document.head || document.documentElement).appendChild(script);
    });
}

// Function to extract main article text
function extractArticleText() {
    // Common selectors for article content
    const selectors = [
        'article',
        '[role="article"]',
        '.article-content',
        '.post-content',
        '.entry-content',
        'main'
    ];

    for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
            // Get all text content, excluding scripts and styles
            const text = element.innerText
                .replace(/\s+/g, ' ')
                .trim();
            return text;
        }
    }
    return null;
}

// Function to create and show the result badge
function showResultBadge(result) {
    try {
        // Remove existing badge if any
        const existingBadge = document.getElementById('fake-news-badge');
        if (existingBadge) {
            existingBadge.remove();
        }

        const badge = document.createElement('div');
        badge.id = 'fake-news-badge';
        badge.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 10px 20px;
            border-radius: 5px;
            color: white;
            font-weight: bold;
            z-index: 10000;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            background-color: ${result.isFake ? '#ff4444' : '#44ff44'};
        `;
        badge.textContent = result.isFake ? '⚠️ Fake News Detected' : '✅ Likely Real News';
        document.body.appendChild(badge);

        // Remove badge after 5 seconds
        setTimeout(() => {
            const badgeToRemove = document.getElementById('fake-news-badge');
            if (badgeToRemove) {
                badgeToRemove.remove();
            }
        }, 5000);
    } catch (error) {
        console.error('Error showing badge:', error);
    }
}

// Function to analyze text using the injected Pyodide loader
async function analyzeText(text) {
    return new Promise((resolve, reject) => {
        try {
            // Create a one-time event listener for the analysis result
            const resultHandler = (event) => {
                window.removeEventListener('ANALYSIS_RESULT', resultHandler);
                if (event.detail && event.detail.error) {
                    reject(new Error(event.detail.error));
                } else {
                    resolve(event.detail);
                }
            };
            window.addEventListener('ANALYSIS_RESULT', resultHandler);

            // Send the text to be analyzed
            window.postMessage({
                type: 'ANALYZE_TEXT',
                text: text
            }, '*');

            // Set a timeout in case the analysis takes too long
            setTimeout(() => {
                window.removeEventListener('ANALYSIS_RESULT', resultHandler);
                reject(new Error('Analysis timed out'));
            }, 30000); // 30 second timeout
        } catch (error) {
            reject(error);
        }
    });
}

// Main function to analyze the page
async function analyzePage() {
    try {
        const articleText = extractArticleText();
        if (!articleText) return null;

        const result = await analyzeText(articleText);
        if (result) {
            showResultBadge(result);
            lastAnalysis = result;
        }
        return result;
    } catch (error) {
        console.error('Error analyzing page:', error);
        return null;
    }
}

// Initialize the extension
async function initialize() {
    try {
        await injectPyodideLoader();
        console.log('Pyodide loader initialized');
    } catch (error) {
        console.error('Error initializing Pyodide loader:', error);
    }
}

// Start initialization when the content script loads
initialize();

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'analyzeText') {
        analyzeText(request.text)
            .then(result => {
                sendResponse({ result });
            })
            .catch(error => {
                console.error('Error analyzing text:', error);
                sendResponse({ error: error.message || 'Analysis failed' });
            });
        return true; // Will respond asynchronously
    }
});

// Run analysis when page is loaded
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(analyzePage, 1000); // Give the page a second to fully load
});

// Also run analysis when URL changes (for single-page applications)
let lastUrl = location.href;
new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
        lastUrl = url;
        lastAnalysis = null; // Clear cached result
        setTimeout(analyzePage, 1000); // Give the page a second to fully load
    }
}).observe(document, { subtree: true, childList: true }); 