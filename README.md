# AI DSA Coach 🧠

An AI-powered Chrome extension and Node.js proxy server designed to act as an educational **Data Structures and Algorithms (DSA) mentor** for students practicing on LeetCode. 

Unlike standard AI chatbots that output direct solutions instantly, **AI DSA Coach** uses custom-designed prompts and session-tracking mechanics to guide the student step-by-step toward the solution, encouraging active problem-solving.

> *"Don't just get the solution. Learn how to find it."*

---

## 🏗️ Architecture

```
LeetCode Web Page ──(injects)──> Main World (Monaco Scraping)
       │                                     │
(gathers details)                      (extracts code)
       │                                     │
       ▼                                     ▼
Chrome Extension Content Script <──(relays code/slug)
       │
(user actions: hint, debug, pattern, complexity)
       │
       ▼
Node.js + Express Backend Proxy ──(sends secure prompts)──> Gemini 1.5 Flash API
```

1. **MAIN World Injection (`inject.js`)**: Runs inside the LeetCode context, directly interfacing with LeetCode's Monaco Editor using global editor models (`window.monaco.editor`).
2. **Chrome Extension (`content.js` + `popup`)**: Acts as a bridge. The popup interface gives the user active options (hints, debug, complexity) and passes the context to the backend.
3. **Node.js/Express Backend Proxy (`server.js`)**: Holds the Gemini API Key securely (satisfying browser extension safety parameters) and executes prompt requests.
4. **Gemini API (`gemini-1.5-flash`)**: Acts as the reasoning engine to serve educational feedback.

---

## 🛠️ Main Features

*   **🧠 Guide My Thinking (Progressive Hints)**: Delivers sequential, structured hints.
    *   *Hint 1*: High-level conceptual direction.
    *   *Hint 2*: Suggests a helpful data structure or general approach.
    *   *Hint 3*: Breaks down algorithmic logic step-by-step without showing code.
    *   *Stuck?*: Reveals full code snippets only upon request (and if No-Spoiler mode is off).
*   **🔍 Check My Code**: Analyzes the user's active code in the editor, pointing out syntax mistakes, logical bugs, and edge cases. Instructs the student on how to trace and fix it without rewriting it for them.
*   **💡 Analyze Approach**: Reviews the user's current approach, highlights bottlenecks (like `O(N^2)` TLE vulnerabilities), and recommends optimization tricks.
*   **⏱️ Complexity Analyzer**: Provides line-by-loop computational complexity breakdowns for Time and Space.
*   **🏷️ Detect DSA Pattern**: Scans the problem context, tags the relevant patterns (e.g., Sliding Window, Two Pointers, Dynamic Programming), and lists 2-3 similar LeetCode practice problems.
*   **🛡️ No-Spoiler Mode**: A toggle mode that blocks the AI from outputting the complete solution code, forcing the student to write the code themselves.

---

## 🚀 Installation & Setup

### 1. Backend Server Setup

Ensure you have [Node.js](https://nodejs.org/) installed (v18+ recommended).

1. Open your terminal and navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Install the node packages:
   ```bash
   npm install
   ```
3. Copy the template env file:
   ```bash
   copy .env.example .env
   # On Linux/macOS: cp .env.example .env
   ```
4. Get a free Gemini API Key from [Google AI Studio](https://aistudio.google.com/) and paste it in your `.env` file:
   ```env
   GEMINI_API_KEY=AIzaSyD...
   ```
5. Start the backend:
   ```bash
   npm start
   ```
   The backend should start running on `http://localhost:5000`.

---

### 2. Chrome Extension Installation

1. Open Google Chrome or any Chromium-based browser (Brave, Edge).
2. Go to the Extensions management page: **`chrome://extensions/`**
3. Turn on the **Developer mode** toggle in the top-right corner.
4. Click **Load unpacked** in the top-left corner.
5. Select the **`extension`** directory from this project workspace.
6. The extension is now loaded! You can pin it to your browser toolbar.

---

## 🎯 Usage Guide

1. Navigate to any problem on LeetCode (e.g., [Two Sum](https://leetcode.com/problems/two-sum/)).
2. Write some starter code in LeetCode's editor, or keep it empty.
3. Open the **AI DSA Coach** extension popup.
4. The extension will automatically detect the problem title, difficulty, and your editor code.
5. Click **Guide My Thinking** to get your first hint. Write follow-up questions in the text box below if you need clarification!
6. Click **Check My Code** to review your editor code if it fails test cases.
7. Click the **Gear icon (⚙️)** in the top right to change settings (such as hosting the backend on a remote URL).

---

## 📝 Project Details

*   **Budget**: ₹0 (Uses Gemini API free tier, local storage, and local Node hosting).
*   **Platform**: Chrome/Chromium Browser extension + Express web server.
*   **Standard**: Manifest V3.
