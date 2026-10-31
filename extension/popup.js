/**
 * JavaScript logic for AI DSA Coach popup.
 * Interacts with Chrome tabs/storage, manages UI state, and calls the backend API.
 */

// Default settings
const DEFAULT_BACKEND_URL = 'http://localhost:5000';
let activeSlug = null;
let activeProblemData = null;

// DOM Elements
const mainView = document.getElementById('main-view');
const settingsView = document.getElementById('settings-view');
const settingsBtn = document.getElementById('settings-btn');
const backBtn = document.getElementById('back-btn');
const saveSettingsBtn = document.getElementById('save-settings-btn');
const backendUrlInput = document.getElementById('backend-url-input');

const problemCard = document.getElementById('problem-card');
const problemTitle = document.getElementById('problem-title');
const problemDifficulty = document.getElementById('problem-difficulty');

const btnHint = document.getElementById('btn-hint');
const hintCounter = document.getElementById('hint-counter');
const btnCheck = document.getElementById('btn-check');
const btnApproach = document.getElementById('btn-approach');
const btnComplexity = document.getElementById('btn-complexity');
const btnPattern = document.getElementById('btn-pattern');
const btnClearHistory = document.getElementById('btn-clear-history');
const learningModeSelect = document.getElementById('learning-mode-select');

const welcomeMessage = document.getElementById('welcome-message');
const loader = document.getElementById('loader');
const loaderText = document.getElementById('loader-text');
const outputContainer = document.getElementById('output-container');
const outputContent = document.getElementById('output-content');

const followupContainer = document.getElementById('followup-container');
const followupInput = document.getElementById('followup-input');
const btnSendFollowup = document.getElementById('btn-send-followup');

const connectionStatus = document.getElementById('connection-status');
const statusText = document.getElementById('status-text');

// Initialize popup on load
document.addEventListener('DOMContentLoaded', async () => {
  // Load configurations
  const settings = await getSettings();
  backendUrlInput.value = settings.backendUrl;
  learningModeSelect.value = settings.learningMode || 'no-spoiler';

  // Toggle View Event Listeners
  settingsBtn.addEventListener('click', () => toggleView('settings'));
  backBtn.addEventListener('click', () => toggleView('main'));
  saveSettingsBtn.addEventListener('click', saveSettings);
  
  // Action Event Listeners
  btnHint.addEventListener('click', () => triggerAction('hint'));
  btnCheck.addEventListener('click', () => triggerAction('check_code'));
  btnApproach.addEventListener('click', () => triggerAction('analyze_approach'));
  btnComplexity.addEventListener('click', () => triggerAction('complexity'));
  btnPattern.addEventListener('click', () => triggerAction('detect_pattern'));
  btnClearHistory.addEventListener('click', resetHintHistory);
  
  btnSendFollowup.addEventListener('click', sendFollowup);
  followupInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendFollowup();
  });

  learningModeSelect.addEventListener('change', async () => {
    await chrome.storage.local.set({ learningMode: learningModeSelect.value });
  });

  // Verify server connectivity
  checkServerConnection(settings.backendUrl);

  // Detect current LeetCode problem
  detectLeetCodeProblem();
});

/**
 * Toggle between Dashboard and Settings views
 */
function toggleView(viewName) {
  if (viewName === 'settings') {
    mainView.classList.add('hidden');
    settingsView.classList.remove('hidden');
  } else {
    settingsView.classList.add('hidden');
    mainView.classList.remove('hidden');
  }
}

/**
 * Retrieve configurations from Chrome Storage
 */
function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['backendUrl', 'learningMode'], (items) => {
      resolve({
        backendUrl: items.backendUrl || DEFAULT_BACKEND_URL,
        learningMode: items.learningMode || 'no-spoiler'
      });
    });
  });
}

/**
 * Save settings to Chrome Storage
 */
async function saveSettings() {
  const url = backendUrlInput.value.trim() || DEFAULT_BACKEND_URL;
  await chrome.storage.local.set({ backendUrl: url });
  checkServerConnection(url);
  toggleView('main');
}

/**
 * Check if the backend server is reachable
 */
async function checkServerConnection(url) {
  setConnectionStatus('connecting', 'Checking server connection...');
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 sec timeout

    // Perform a request to a non-existent path but to see if host responds
    const response = await fetch(`${url}/api/problem/ping-health`, {
      method: 'GET',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    setConnectionStatus('online', 'Connected to Backend');
  } catch (error) {
    setConnectionStatus('offline', 'Backend Server Offline');
    console.error('Connection check failed:', error);
  }
}

function setConnectionStatus(state, text) {
  connectionStatus.className = `status-indicator ${state}`;
  statusText.textContent = text;
}

/**
 * Identify if the user is on a LeetCode problem page
 */
async function detectLeetCodeProblem() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url || !tab.url.includes('leetcode.com/problems/')) {
    showNoProblemState();
    return;
  }

  // Send message to content script to gather details
  chrome.tabs.sendMessage(tab.id, { action: 'GET_PROBLEM_DETAILS' }, (response) => {
    if (chrome.runtime.lastError || !response || !response.success) {
      showErrorState(chrome.runtime.lastError?.message || response?.error || 'Failed to detect LeetCode details.');
      return;
    }

    activeSlug = response.slug;
    activeProblemData = {
      slug: response.slug,
      title: response.title,
      code: response.code,
      language: response.language
    };

    // Update UI elements
    problemTitle.textContent = response.title;
    
    // We don't have difficulty immediately, let the backend fetch it
    problemDifficulty.textContent = 'Active';
    problemDifficulty.className = 'difficulty-badge Medium';

    // Show Main controls
    enableActionButtons();
    
    // Update hint counter from history
    updateHintCounterUI();
  });
}

function showNoProblemState() {
  problemTitle.textContent = 'Please open a LeetCode problem';
  problemDifficulty.textContent = 'Inactive';
  problemDifficulty.className = 'difficulty-badge Easy';
  disableActionButtons();
}

function showErrorState(msg) {
  problemTitle.textContent = 'Cannot read LeetCode Editor';
  problemDifficulty.textContent = 'Error';
  problemDifficulty.className = 'difficulty-badge Hard';
  
  welcomeMessage.innerHTML = `
    <div class="tips-box" style="border-color: var(--error)">
      <h4 style="color: var(--error)">⚠️ Editor Not Found</h4>
      <p style="font-size: 0.78rem; margin-top: 4px;">${msg}</p>
      <p style="font-size: 0.78rem; margin-top: 6px; color: var(--text-muted)">
        Please refresh the LeetCode page and ensure you are signed in and viewing a problem statement.
      </p>
    </div>
  `;
}

function disableActionButtons() {
  btnHint.disabled = true;
  btnCheck.disabled = true;
  btnApproach.disabled = true;
  btnComplexity.disabled = true;
  btnPattern.disabled = true;
  btnClearHistory.disabled = true;
}

function enableActionButtons() {
  btnHint.disabled = false;
  btnCheck.disabled = false;
  btnApproach.disabled = false;
  btnComplexity.disabled = false;
  btnPattern.disabled = false;
  btnClearHistory.disabled = false;
}

/**
 * Handle Progressive Hint History
 */
function getHintHistory(slug) {
  return new Promise((resolve) => {
    chrome.storage.local.get([`hints_${slug}`], (items) => {
      resolve(items[`hints_${slug}`] || []);
    });
  });
}

async function saveHintToHistory(slug, hintText) {
  const history = await getHintHistory(slug);
  history.push(hintText);
  await chrome.storage.local.set({ [`hints_${slug}`]: history });
  updateHintCounterUI();
}

async function resetHintHistory() {
  if (!activeSlug) return;
  await chrome.storage.local.remove([`hints_${activeSlug}`]);
  updateHintCounterUI();
  
  welcomeMessage.classList.remove('hidden');
  outputContainer.classList.add('hidden');
  followupContainer.classList.add('hidden');
  
  alert('Hint progression has been reset for this problem!');
}

async function updateHintCounterUI() {
  if (!activeSlug) {
    hintCounter.textContent = 'Hint 1';
    return;
  }
  const history = await getHintHistory(activeSlug);
  hintCounter.textContent = `Hint ${history.length + 1}`;
}

/**
 * Trigger AI DSA Coach action
 */
async function triggerAction(action) {
  if (!activeProblemData) return;
  
  const settings = await getSettings();
  
  // Show Loader
  welcomeMessage.classList.add('hidden');
  outputContainer.classList.add('hidden');
  followupContainer.classList.add('hidden');
  loader.classList.remove('hidden');

  let loaderMessage = 'Analyzing problem and thinking...';
  if (action === 'check_code') loaderMessage = 'Debugging your code...';
  else if (action === 'analyze_approach') loaderMessage = 'Analyzing your algorithm...';
  else if (action === 'complexity') loaderMessage = 'Calculating complexity...';
  else if (action === 'detect_pattern') loaderMessage = 'Detecting design patterns...';
  
  loaderText.textContent = loaderMessage;

  // Retrieve code from the tab dynamically again to ensure it's up to date
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.tabs.sendMessage(tab.id, { action: 'GET_PROBLEM_DETAILS' }, async (response) => {
    let currentCode = activeProblemData.code;
    let currentLang = activeProblemData.language;
    
    if (response && response.success) {
      currentCode = response.code;
      currentLang = response.language;
      
      // Update local cache
      activeProblemData.code = response.code;
      activeProblemData.language = response.language;
    }

    const hintHistory = await getHintHistory(activeSlug);

    try {
      const apiResponse = await fetch(`${settings.backendUrl}/api/coach`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: action,
          slug: activeSlug,
          title: activeProblemData.title,
          code: currentCode,
          language: currentLang,
          hintHistory: hintHistory,
          learningMode: settings.learningMode
        })
      });

      if (!apiResponse.ok) {
        const errorJson = await apiResponse.json().catch(() => ({}));
        throw new Error(errorJson.error || `Server responded with status ${apiResponse.status}`);
      }

      const data = await apiResponse.json();
      
      // Hide loader
      loader.classList.add('hidden');
      outputContainer.classList.remove('hidden');

      if (data.success) {
        const parsedHTML = parseMarkdown(data.response);
        outputContent.innerHTML = parsedHTML;
        
        // Auto scroll to top of output
        outputContainer.scrollTop = 0;
        
        // Attach copy functionality
        setupCodeCopyButtons();

        // If it was a hint, save it to history and show follow up
        if (action === 'hint') {
          await saveHintToHistory(activeSlug, data.response);
          followupContainer.classList.remove('hidden');
        }
      } else {
        throw new Error('AI Coach responded with success=false');
      }
    } catch (error) {
      loader.classList.add('hidden');
      welcomeMessage.classList.remove('hidden');
      alert(`API Error: ${error.message}`);
    }
  });
}

/**
 * Handle Follow-up text inputs
 */
async function sendFollowup() {
  const text = followupInput.value.trim();
  if (!text || !activeProblemData) return;

  followupInput.value = '';
  const settings = await getSettings();

  // Show inline loader inside output instead of full screen spinner
  const userBubble = document.createElement('div');
  userBubble.className = 'user-message-bubble';
  userBubble.style.cssText = 'background: rgba(99, 102, 241, 0.1); border-left: 3px solid var(--primary); padding: 8px 12px; border-radius: var(--radius-sm); margin-top: 14px; font-size: 0.82rem;';
  userBubble.innerHTML = `<strong>You:</strong> ${text}`;
  outputContent.appendChild(userBubble);
  
  const loadingIndicator = document.createElement('div');
  loadingIndicator.className = 'typing-indicator';
  loadingIndicator.style.cssText = 'font-size: 0.78rem; color: var(--text-muted); padding: 8px 0; font-style: italic;';
  loadingIndicator.textContent = 'Coach is typing...';
  outputContent.appendChild(loadingIndicator);
  
  outputContainer.scrollTop = outputContainer.scrollHeight;

  const hintHistory = await getHintHistory(activeSlug);

  try {
    const apiResponse = await fetch(`${settings.backendUrl}/api/coach`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'hint',
        slug: activeSlug,
        title: activeProblemData.title,
        code: activeProblemData.code,
        language: activeProblemData.language,
        hintHistory: hintHistory,
        learningMode: settings.learningMode,
        userRequestText: text
      })
    });

    loadingIndicator.remove();

    if (!apiResponse.ok) {
      throw new Error(`Server status ${apiResponse.status}`);
    }

    const data = await apiResponse.json();
    if (data.success) {
      const responseSection = document.createElement('div');
      responseSection.className = 'coach-response-bubble';
      responseSection.style.cssText = 'margin-top: 14px; border-top: 1px solid var(--border-color); padding-top: 14px;';
      responseSection.innerHTML = parseMarkdown(data.response);
      outputContent.appendChild(responseSection);
      
      // Setup copy buttons for code snippets inside response
      setupCodeCopyButtons();
      
      // Save it to history
      await saveHintToHistory(activeSlug, data.response);
      
      // Scroll to bottom
      outputContainer.scrollTop = outputContainer.scrollHeight;
    }
  } catch (error) {
    loadingIndicator.remove();
    alert(`Error: ${error.message}`);
  }
}

/**
 * Configure Click to Copy handlers on Monaco code containers
 */
function setupCodeCopyButtons() {
  const copyButtons = outputContent.querySelectorAll('.copy-btn');
  copyButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const container = btn.closest('.code-container');
      const code = container.querySelector('code');
      if (code) {
        navigator.clipboard.writeText(code.innerText).then(() => {
          const originalText = btn.textContent;
          btn.textContent = 'Copied!';
          btn.style.color = 'var(--accent)';
          setTimeout(() => {
            btn.textContent = originalText;
            btn.style.color = '';
          }, 1500);
        }).catch(err => {
          console.error('Clipboard copy failed:', err);
        });
      }
    });
  });
}

/**
 * Markdown Line Parser
 */
function parseMarkdown(md) {
  if (!md) return '';
  
  const lines = md.split('\n');
  let html = '';
  let inCodeBlock = false;
  let inList = false;
  let codeBlockContent = [];
  let codeLang = '';

  for (let line of lines) {
    // Handle code blocks
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        // End code block
        inCodeBlock = false;
        const codeText = codeBlockContent.join('\n')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
        html += `<div class="code-container">
          <div class="code-header">
            <span>${codeLang || 'code'}</span>
            <button class="copy-btn">Copy</button>
          </div>
          <pre><code class="language-${codeLang}">${codeText}</code></pre>
        </div>`;
        codeBlockContent = [];
        codeLang = '';
      } else {
        // Start code block
        inCodeBlock = true;
        codeLang = line.trim().substring(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent.push(line);
      continue;
    }

    // Process lists
    const listMatch = line.match(/^(\s*)[-*+]\s+(.*)$/);
    if (listMatch) {
      if (!inList) {
        html += '<ul>';
        inList = true;
      }
      html += `<li>${inlineFormatting(listMatch[2])}</li>`;
      continue;
    } else if (inList && line.trim() === '') {
      // Ignore empty line in bullet group
    } else if (inList) {
      html += '</ul>';
      inList = false;
    }

    // Headers
    if (line.startsWith('# ')) {
      html += `<h1>${inlineFormatting(line.substring(2))}</h1>`;
    } else if (line.startsWith('## ')) {
      html += `<h2>${inlineFormatting(line.substring(3))}</h2>`;
    } else if (line.startsWith('### ')) {
      html += `<h3>${inlineFormatting(line.substring(4))}</h3>`;
    } else if (line.trim() === '') {
      html += '<div class="space"></div>';
    } else {
      html += `<p>${inlineFormatting(line)}</p>`;
    }
  }

  if (inList) {
    html += '</ul>';
  }

  return html;
}

function inlineFormatting(text) {
  let escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Bold: **text**
  escaped = escaped.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  
  // Italics: *text*
  escaped = escaped.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  
  // Inline Code: `code`
  escaped = escaped.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
  
  // Fallback LaTeX Inline Math: $math$ -> <code>math</code>
  escaped = escaped.replace(/\$([^$]+)\$/g, (match, math) => {
    // Strip common LaTeX commands (e.g. \log -> log, \le -> le) for readable text
    const cleaned = math.replace(/\\(log|le|ge|sum|prod|alpha|beta|gamma|theta|delta|epsilon|phi|pi|sqrt)/g, '$1');
    return `<code class="inline-code">${cleaned}</code>`;
  });
  
  return escaped;
}
