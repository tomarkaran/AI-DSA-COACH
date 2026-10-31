/**
 * Content script running in the LeetCode tab's isolated context.
 * Injects inject.js and acts as a bridge between the popup and the main window context.
 */

// Inject the main world script (inject.js) to access window.monaco
try {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('inject.js');
  script.onload = function() {
    this.remove(); // Clean up script tag from DOM
  };
  (document.head || document.documentElement).appendChild(script);
} catch (e) {
  console.error('AI DSA Coach: Injected script loading failed:', e);
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'GET_PROBLEM_DETAILS') {
    const pathname = window.location.pathname;
    const pathParts = pathname.split('/');
    
    // Check if we are actually on a problem page
    // Typical path: /problems/two-sum/ or /problems/two-sum/description/
    if (pathParts[1] !== 'problems' || !pathParts[2]) {
      sendResponse({
        success: false,
        error: 'Please open a LeetCode problem page (e.g., https://leetcode.com/problems/two-sum/).'
      });
      return;
    }

    const slug = pathParts[2];
    const pageTitle = document.title ? document.title.split(' - ')[0] : slug;
    
    // Set up a one-time message listener for the main world script's response
    const handleCodeResponse = (event) => {
      if (event.source !== window) return;
      
      if (event.data && event.data.type === 'GET_LEETCODE_CODE_RESPONSE') {
        window.removeEventListener('message', handleCodeResponse);
        
        if (event.data.success) {
          sendResponse({
            success: true,
            slug: slug,
            title: pageTitle,
            code: event.data.code,
            language: event.data.language
          });
        } else {
          // If code extraction failed, send problem slug and title anyway (user can still ask for hints)
          sendResponse({
            success: true,
            slug: slug,
            title: pageTitle,
            code: '',
            language: '',
            warning: event.data.error || 'Could not extract code. Make sure the editor is visible.'
          });
        }
      }
    };

    // Listen for code response from inject.js
    window.addEventListener('message', handleCodeResponse);
    
    // Send request to inject.js
    window.postMessage({ type: 'GET_LEETCODE_CODE_REQUEST' }, '*');
    
    // Return true to keep message channel open for async response
    return true;
  }
});
