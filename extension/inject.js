/**
 * Script injected into LeetCode's Main World.
 * Has direct access to window.monaco to retrieve the editor code.
 */
(function() {
  window.addEventListener('message', (event) => {
    // Only accept messages from the same page context
    if (event.source !== window) return;

    if (event.data && event.data.type === 'GET_LEETCODE_CODE_REQUEST') {
      try {
        if (typeof window.monaco !== 'undefined' && window.monaco.editor) {
          const models = window.monaco.editor.getModels();
          if (models && models.length > 0) {
            // Find the most appropriate model (non-empty, non-plaintext, or first one)
            let selectedModel = models[0];
            
            // If there are multiple, look for one that is not plaintext and has content
            if (models.length > 1) {
              const activeModel = models.find(m => {
                const lang = m.getLanguageId ? m.getLanguageId() : '';
                return lang && lang !== 'plaintext' && lang !== 'markdown';
              });
              if (activeModel) {
                selectedModel = activeModel;
              }
            }

            const code = selectedModel.getValue();
            const language = selectedModel.getLanguageId 
              ? selectedModel.getLanguageId() 
              : (selectedModel.getModeId ? selectedModel.getModeId() : 'unknown');

            window.postMessage({
              type: 'GET_LEETCODE_CODE_RESPONSE',
              success: true,
              code: code,
              language: language
            }, '*');
          } else {
            window.postMessage({
              type: 'GET_LEETCODE_CODE_RESPONSE',
              success: false,
              error: 'Monaco models are empty.'
            }, '*');
          }
        } else {
          // If window.monaco is not loaded, we can try to fall back to getting code from CodeMirror (older LeetCode editor)
          // or from DOM text containers if they exist.
          const codeMirrorContainer = document.querySelector('.CodeMirror');
          if (codeMirrorContainer && codeMirrorContainer.CodeMirror) {
            const cm = codeMirrorContainer.CodeMirror;
            window.postMessage({
              type: 'GET_LEETCODE_CODE_RESPONSE',
              success: true,
              code: cm.getValue(),
              language: 'unknown'
            }, '*');
          } else {
            window.postMessage({
              type: 'GET_LEETCODE_CODE_RESPONSE',
              success: false,
              error: 'Monaco/CodeMirror editor not found. Make sure the LeetCode page has fully loaded.'
            }, '*');
          }
        }
      } catch (e) {
        window.postMessage({
          type: 'GET_LEETCODE_CODE_RESPONSE',
          success: false,
          error: e.toString()
        }, '*');
      }
    }
  });
})();
