import * as vscode from "vscode";
import ollama from "ollama";

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand(
    "ahmed-deepseek.start",
    () => {
      const panel = vscode.window.createWebviewPanel(
        "deepseek",
        "DeepSeek Chat",
        vscode.ViewColumn.One,
        {
          enableScripts: true,
        }
      );

      panel.webview.html = getWebviewContent();

      panel.webview.onDidReceiveMessage(async (message) => {
        if (message.command === "chat") {
          const userPrompt = message.text;
          let response = "";

          panel.webview.postMessage({
            command: "chatStart",
            message: { role: "assistant", content: "" },
          });

          const systemPrompt = `
You are a helpful AI assistant. Please format your responses using markdown:

- Use \`code\` for inline code
- Use \`\`\` for code blocks with language specification
- Use > for quotes
- Use * or - for lists
- Use # ## ### for headers
- Use **bold** and *italic* for emphasis
- Use tables when presenting structured data
- Use --- for horizontal rules to separate sections

Keep responses clear and well-structured.
`;

          try {
            const streamResponse = await ollama.chat({
              model: "deepseek-r1:1.5b",
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
              ],
              stream: true,
            });

            for await (const part of streamResponse) {
              response += part.message.content;

              panel.webview.postMessage({
                command: "chatStream",
                text: response,
              });
            }

            panel.webview.postMessage({
              command: "chatComplete",
              message: { role: "assistant", content: response },
            });
          } catch (error) {
            panel.webview.postMessage({
              command: "chatError",
              text: "Error: " + (error as Error).message,
            });
          }
        }
      });
    }
  );

  context.subscriptions.push(disposable);
}

function getWebviewContent() {
  return /*html*/ `
    <!DOCTYPE html>
    <html lang="en" class="light">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>DeepSeek Chat</title>
        <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
        <style>
            /* Theme variables */
            .light {
                --theme-bg: #ffffff;
                --theme-fg: #171717;
                --theme-border: #e5e7eb;
                --theme-hover: #f3f4f6;
                --theme-code-bg: #f9fafb;
                --theme-input-bg: #ffffff;
                --theme-input-border: #d1d5db;
                --theme-button-bg: #000000;
                --theme-button-fg: #ffffff;
                --theme-message-user: #f3f4f6;
                --theme-message-bot: #ffffff;
                --theme-accent: #2563eb;
                --theme-code-block-bg: #f8fafc;
                --theme-inline-code-bg: #f1f5f9;
            }

            .dark {
                --theme-bg: #1a1a1a;
                --theme-fg: #e5e5e5;
                --theme-border: #333333;
                --theme-hover: #262626;
                --theme-code-bg: #2d2d2d;
                --theme-input-bg: #262626;
                --theme-input-border: #404040;
                --theme-button-bg: #2563eb;
                --theme-button-fg: #ffffff;
                --theme-message-user: #262626;
                --theme-message-bot: #1a1a1a;
                --theme-accent: #3b82f6;
                --theme-code-block-bg: #1e293b;
                --theme-inline-code-bg: #1e293b;
            }

            body {
                margin: 0;
                padding: 0;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
                background: var(--theme-bg);
                color: var(--theme-fg);
                transition: background-color 0.3s, color 0.3s;
            }

            .container {
                max-width: 100%;
                margin: 0 auto;
                display: flex;
                flex-direction: column;
                height: 100vh;
            }

            .header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 1rem;
                border-bottom: 1px solid var(--theme-border);
                background: var(--theme-bg);
                position: sticky;
                top: 0;
                z-index: 10;
            }

            .theme-toggle {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                padding: 0.5rem;
                border: 1px solid var(--theme-border);
                border-radius: 0.5rem;
                background: var(--theme-input-bg);
                color: var(--theme-fg);
                cursor: pointer;
                transition: all 0.2s;
            }

            .theme-toggle:hover {
                background: var(--theme-hover);
            }

            .theme-toggle svg {
                width: 1.2rem;
                height: 1.2rem;
            }

            .chat-container {
                flex: 1;
                overflow-y: auto;
                padding: 1rem;
            }

            .message {
                margin-bottom: 1rem;
                padding: 1rem;
                border-radius: 0.5rem;
                border: 1px solid var(--theme-border);
                max-width: 85%;
            }

            .message.user {
                background: var(--theme-message-user);
                margin-left: auto;
            }

            .message.assistant {
                background: var(--theme-message-bot);
                margin-right: auto;
            }

            .message-header {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                margin-bottom: 0.5rem;
                font-size: 0.9em;
                color: var(--theme-fg);
                opacity: 0.7;
            }

            /* Markdown Styles */
            .markdown-content {
                font-size: 0.875rem;
                line-height: 1.6;
            }

            .markdown-content p {
                margin: 0.5em 0;
            }

            .markdown-content h1,
            .markdown-content h2,
            .markdown-content h3,
            .markdown-content h4 {
                margin-top: 1.5em;
                margin-bottom: 0.5em;
                font-weight: 600;
            }

            .markdown-content h1 { font-size: 1.5em; }
            .markdown-content h2 { font-size: 1.3em; }
            .markdown-content h3 { font-size: 1.1em; }

            .markdown-content ul,
            .markdown-content ol {
                padding-left: 1.5em;
                margin: 0.5em 0;
            }

            .markdown-content li {
                margin: 0.3em 0;
            }

            .markdown-content code {
                background: var(--theme-inline-code-bg);
                padding: 0.2em 0.4em;
                border-radius: 0.2rem;
                font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
                font-size: 0.9em;
            }

            .markdown-content pre {
                background: var(--theme-code-block-bg);
                padding: 1rem;
                border-radius: 0.5rem;
                overflow-x: auto;
                margin: 1em 0;
            }

            .markdown-content pre code {
                background: none;
                padding: 0;
                font-size: 0.85em;
                line-height: 1.5;
            }

            .markdown-content blockquote {
                border-left: 3px solid var(--theme-accent);
                margin: 1em 0;
                padding-left: 1em;
                color: var(--theme-fg);
                opacity: 0.8;
            }

            .markdown-content table {
                border-collapse: collapse;
                width: 100%;
                margin: 1em 0;
            }

            .markdown-content th,
            .markdown-content td {
                border: 1px solid var(--theme-border);
                padding: 0.5em;
                text-align: left;
            }

            .markdown-content th {
                background: var(--theme-hover);
            }

            .input-container {
                padding: 1rem;
                border-top: 1px solid var(--theme-border);
                background: var(--theme-bg);
            }

            .input-form {
                display: flex;
                gap: 0.5rem;
            }

            .input-textarea {
                flex: 1;
                padding: 0.75rem;
                min-height: 2.5rem;
                max-height: 150px;
                resize: vertical;
                background: var(--theme-input-bg);
                color: var(--theme-fg);
                border: 1px solid var(--theme-input-border);
                border-radius: 0.5rem;
                font-family: inherit;
                font-size: 0.875rem;
            }

            .input-textarea:focus {
                outline: none;
                border-color: var(--theme-accent);
            }

            .send-button {
                padding: 0.75rem 1.5rem;
                background: var(--theme-button-bg);
                color: var(--theme-button-fg);
                border: none;
                border-radius: 0.5rem;
                cursor: pointer;
                font-size: 0.875rem;
                transition: opacity 0.2s;
            }

            .send-button:hover {
                opacity: 0.9;
            }

            .send-button:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }

            .keyboard-hint {
                font-size: 0.75rem;
                color: var(--theme-fg);
                opacity: 0.7;
                margin-top: 0.5rem;
                text-align: right;
            }

            .loading {
                display: inline-block;
                margin-left: 0.5rem;
                opacity: 0.7;
            }

            .error {
                color: #ef4444;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <header class="header">
                <h2>DeepSeek Chat</h2>
                <button id="themeToggle" class="theme-toggle" aria-label="Toggle theme">
                    <svg id="lightIcon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="hidden">
                        <circle cx="12" cy="12" r="5"></circle>
                        <line x1="12" y1="1" x2="12" y2="3"></line>
                        <line x1="12" y1="21" x2="12" y2="23"></line>
                        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                        <line x1="1" y1="12" x2="3" y2="12"></line>
                        <line x1="21" y1="12" x2="23" y2="12"></line>
                        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                    </svg>
                    <svg id="darkIcon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                    </svg>
                    <span id="themeText">Dark Mode</span>
                </button>
            </header>
            
            <div class="chat-container" id="chatContainer">
                <!-- Messages will be inserted here -->
            </div>

            <div class="input-container">
                <form class="input-form" id="chatForm">
                    <textarea 
                        id="prompt" 
                        class="input-textarea"
                        placeholder="Type your message... "
                        rows="1"
                    ></textarea>
                    <button type="submit" class="send-button" id="sendButton">Send</button>
                </form>
                <div class="keyboard-hint">Press Enter to send, Shift + Enter for new line</div>
            </div>
        </div>

        <script>
            const vscode = acquireVsCodeApi();
            const chatContainer = document.getElementById("chatContainer");
            const chatForm = document.getElementById("chatForm");
            const promptInput = document.getElementById("prompt");
            const sendButton = document.getElementById("sendButton");
            const themeToggle = document.getElementById("themeToggle");
            const themeText = document.getElementById("themeText");
            const lightIcon = document.getElementById("lightIcon");
            const darkIcon = document.getElementById("darkIcon");

            // Theme management
            let isDarkMode = false;
            
            // Try to load saved theme preference
            try {
                const state = vscode.getState() || {};
                isDarkMode = state.isDarkMode || false;
                updateTheme();
            } catch (e) {
                console.error('Failed to load theme preference:', e);
            }

            themeToggle.addEventListener('click', () => {
                isDarkMode = !isDarkMode;
                updateTheme();
                
                // Save theme preference
                try {
                    vscode.setState({ ...vscode.getState(), isDarkMode });
                } catch (e) {
                    console.error('Failed to save theme preference:', e);
                }
            });

            function updateTheme() {
                document.documentElement.className = isDarkMode ? 'dark' : 'light';
                themeText.textContent = isDarkMode ? 'Light Mode' : 'Dark Mode';
                lightIcon.style.display = isDarkMode ? 'block' : 'none';
                darkIcon.style.display = isDarkMode ? 'none' : 'block';
            }

            let isProcessing = false;

            // Auto-resize textarea
            promptInput.addEventListener('input', function() {
                this.style.height = 'auto';
                this.style.height = Math.min(this.scrollHeight, 150) + 'px';
            });

            // Handle keyboard events
            promptInput.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (!isProcessing && this.value.trim()) {
                        chatForm.requestSubmit();
                    }
                }
            });

            // Handle form submission
            chatForm.addEventListener("submit", (e) => {
                e.preventDefault();
                if (isProcessing) return;

                const text = promptInput.value.trim();
                if (!text) return;

                addMessage({ role: 'user', content: text });
                
                promptInput.value = '';
                promptInput.style.height = 'auto';

                isProcessing = true;
                updateSendButton();
                vscode.postMessage({ command: "chat", text });
            });

            // Handle messages from extension
            window.addEventListener('message', event => {
                const message = event.data;

                switch (message.command) {
                    case 'chatStart':
                        addMessage({ role: 'assistant', content: '', loading: true });
                        break;

                    case 'chatStream':
                        updateLastMessage(message.text);
                        break;

                    case 'chatComplete':
                        updateLastMessage(message.message.content, false);
                        isProcessing = false;
                        updateSendButton();🐒
                        break;

                    case 'chatError':
                        updateLastMessage(message.text, false, true);
                        isProcessing = false;
                        updateSendButton();
                        break;
                }
            });

            function addMessage({ role, content, loading = false }) {
                const messageDiv = document.createElement('div');
                messageDiv.className = \`message \${role}\`;
                
                messageDiv.innerHTML = \`
                    <div class="message-header">
                        \${role === 'user' ? '🦍 You' : '🤖 DeepSeek'}
                    </div>
                    <div class="message-content markdown-content">
                        \${loading ? '<span class="loading">Thinking...</span>' : marked.parse(content)}
                    </div>
                \`;

                chatContainer.appendChild(messageDiv);
                chatContainer.scrollTop = chatContainer.scrollHeight;
            }

            function updateLastMessage(content, loading = false, error = false) {
                const lastMessage = chatContainer.lastElementChild;
                if (lastMessage) {
                    const messageContent = lastMessage.querySelector('.message-content');
                    if (messageContent) {
                        if (error) {
                            messageContent.innerHTML = \`<span class="error">\${content}</span>\`;
                        } else {
                            messageContent.innerHTML = loading ? 
                                \`<span class="loading">Thinking...</span>\` : marked.parse(content);
                        }
                    }
                    chatContainer.scrollTop = chatContainer.scrollHeight;
                }
            }

            function updateSendButton() {
                sendButton.disabled = isProcessing;
                sendButton.textContent = isProcessing ? 'Sending...' : 'Send';
            }

            // Focus input on load
            promptInput.focus();
        </script>
    </body>
    </html>`;
}

export function deactivate() {}
