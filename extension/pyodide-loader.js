// Initialize variables
let pyodide = null;
let classifier = null;

// Function to load Pyodide script
function loadPyodideScript() {
  return new Promise((resolve, reject) => {
    if (window.loadPyodide) {
      console.log('Pyodide already loaded');
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('pyodide/pyodide.js');
    script.onload = () => {
      console.log('Pyodide script loaded');
      resolve();
    };
    script.onerror = (error) => {
      console.error('Error loading Pyodide script:', error);
      reject(error);
    };
    document.head.appendChild(script);
  });
}

// Initialize Pyodide and load the model
async function initializePyodide() {
  if (!pyodide) {
    try {
      await loadPyodideScript();
      
      if (!window.loadPyodide) {
        throw new Error('loadPyodide function not found after script load');
      }
      
      // Now we can use loadPyodide
      pyodide = await window.loadPyodide({
        indexURL: chrome.runtime.getURL('pyodide/')
      });
      
      // Install required packages
      await pyodide.loadPackage(['micropip']);
      await pyodide.runPythonAsync(`
        import micropip
        await micropip.install(['transformers', 'torch'])
      `);
      
      // Initialize the classifier
      await pyodide.runPythonAsync(`
        from transformers import pipeline
        classifier = pipeline("text-classification", model="facebook/bart-large-mnli")
      `);
      
      console.log('Pyodide initialized successfully');
    } catch (error) {
      console.error('Error initializing Pyodide:', error);
      return null;
    }
  }
  return pyodide;
}

// Analyze text using the model
async function analyzeText(text) {
  try {
    if (!pyodide) {
      pyodide = await initializePyodide();
      if (!pyodide) {
        throw new Error('Failed to initialize Pyodide');
      }
    }

    const result = await pyodide.runPythonAsync(`
      # Prepare the text for analysis
      text = """${text}"""
      
      # Use the classifier to analyze the text
      result = classifier(text, candidate_labels=["fake news", "real news"])
      
      # Get the label with highest score
      label = result[0]['labels'][0]
      score = result[0]['scores'][0]
      
      # Return the result
      {"isFake": label == "fake news", "confidence": score}
    `);
    
    return result.toJs();
  } catch (error) {
    console.error('Error analyzing text:', error);
    return null;
  }
}

// Listen for messages from the content script
window.addEventListener('message', async (event) => {
  if (event.data.type === 'ANALYZE_TEXT') {
    try {
      const result = await analyzeText(event.data.text);
      window.dispatchEvent(new CustomEvent('ANALYSIS_RESULT', {
        detail: result
      }));
    } catch (error) {
      console.error('Error in message handler:', error);
      window.dispatchEvent(new CustomEvent('ANALYSIS_RESULT', {
        detail: { error: 'Analysis failed' }
      }));
    }
  }
}); 