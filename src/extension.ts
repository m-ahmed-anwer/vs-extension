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

          // Send initial empty response to show loading state
          panel.webview.postMessage({
            command: "chatStart",
            message: { role: "assistant", content: "" },
          });

          try {
            const streamResponse = await ollama.chat({
              model: "deepseek-r1:1.5b",
              messages: [{ role: "user", content: userPrompt }],
              stream: true,
            });

            for await (const part of streamResponse) {
              response += part.message.content;

              panel.webview.postMessage({
                command: "chatStream",
                text: response,
              });
            }

            // Send final complete message
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
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>DeepSeek Chat</title>
        <style>
            :root {
                --background: #ffffff;
                --foreground: #171717;
                --muted: #f3f4f6;
                --muted-foreground: #6b7280;
                --border: #e5e7eb;
                --primary: #000000;
                --primary-foreground: #ffffff;
            }

            body {
                margin: 0;
                padding: 0;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
                background: var(--background);
                color: var(--foreground);
            }

            .container {
                display: flex;
                flex-direction: column;
                height: 100vh;
                max-width: 1000px;
                margin: 0 auto;
            }

            .header {
                padding: 1rem;
                border-bottom: 1px solid var(--border);
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }

            .header h2 {
                margin: 0;
                font-size: 1rem;
                font-weight: 500;
            }

            .chat-container {
                flex: 1;
                overflow-y: auto;
                padding: 1rem;
            }

            .message {
                display: flex;
                gap: 1rem;
                margin-bottom: 1.5rem;
            }

            .avatar {
                width: 2rem;
                height: 2rem;
                border-radius: 0.5rem;
                background: var(--muted);
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: 500;
            }

            .message-content {
                flex: 1;
                background: var(--muted);
                padding: 1rem;
                border-radius: 0.5rem;
                font-size: 0.875rem;
                line-height: 1.5;
            }

            .user .message-content {
                background: var(--primary);
                color: var(--primary-foreground);
            }

            .input-container {
                border-top: 1px solid var(--border);
                padding: 1rem;
            }

            .input-form {
                display: flex;
                gap: 0.5rem;
            }

            .input-textarea {
                flex: 1;
                padding: 0.75rem;
                border: 1px solid var(--border);
                border-radius: 0.5rem;
                font-family: inherit;
                font-size: 0.875rem;
                resize: none;
                min-height: 20px;
                max-height: 200px;
                outline: none;
            }

            .input-textarea:focus {
                border-color: var(--primary);
            }

            .send-button {
                padding: 0.75rem 1.5rem;
                background: var(--primary);
                color: var(--primary-foreground);
                border: none;
                border-radius: 0.5rem;
                font-size: 0.875rem;
                font-weight: 500;
                cursor: pointer;
                transition: opacity 0.2s;
            }

            .send-button:hover {
                opacity: 0.9;
            }

            .send-button:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }

            .loading {
                display: inline-block;
                width: 1rem;
                height: 1rem;
                border: 2px solid var(--muted);
                border-radius: 50%;
                border-top-color: var(--primary);
                animation: spin 1s linear infinite;
            }

            @keyframes spin {
                to {
                    transform: rotate(360deg);
                }
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
            </header>
            
            <div class="chat-container" id="chatContainer">
                <!-- Messages will be inserted here -->
            </div>

            <div class="input-container">
                <form class="input-form" id="chatForm">
                    <textarea 
                        id="prompt" 
                        class="input-textarea"
                        placeholder="Type your message..."
                        rows="1"
                    ></textarea>
                    <button type="submit" class="send-button" id="sendButton">
                        Send
                    </button>
                </form>
            </div>
        </div>

        <script>
            const vscode = acquireVsCodeApi();
            const chatContainer = document.getElementById("chatContainer");
            const chatForm = document.getElementById("chatForm");
            const promptInput = document.getElementById("prompt");
            const sendButton = document.getElementById("sendButton");

            let isProcessing = false;

            // Auto-resize textarea
            promptInput.addEventListener('input', function() {
                this.style.height = 'auto';
                this.style.height = Math.min(this.scrollHeight, 200) + 'px';
            });

            // Handle form submission
            chatForm.addEventListener("submit", (e) => {
                e.preventDefault();
                if (isProcessing) return;

                const text = promptInput.value.trim();
                if (!text) return;

                // Add user message
                addMessage({ role: 'user', content: text });
                
                // Clear input and reset height
                promptInput.value = '';
                promptInput.style.height = 'auto';

                // Send message to extension
                isProcessing = true;
                updateSendButton();
                vscode.postMessage({ command: "chat", text });
            });

            // Handle messages from extension
            window.addEventListener('message', event => {
                const message = event.data;

                switch (message.command) {
                    case 'chatStart':
                        // Initialize assistant message
                        addMessage({ role: 'assistant', content: '', loading: true });
                        break;

                    case 'chatStream':
                        // Update the last message with streamed content
                        updateLastMessage(message.text);
                        break;

                    case 'chatComplete':
                        // Complete the message
                        updateLastMessage(message.message.content, false);
                        isProcessing = false;
                        updateSendButton();
                        break;

                    case 'chatError':
                        // Handle error
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
                    <div class="avatar">\${role === 'user' ? 'U' : 'A'}</div>
                    <div class="message-content">
                        \${loading ? '<div class="loading"></div>' : content}
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
                                \`\${content}<div class="loading"></div>\` : content;
                        }
                    }
                    chatContainer.scrollTop = chatContainer.scrollHeight;
                }
            }

            function updateSendButton() {
                sendButton.disabled = isProcessing;
                sendButton.textContent = isProcessing ? 'Sending...' : 'Send';
            }
        </script>
    </body>
    </html>`;
}

export function deactivate() {}
