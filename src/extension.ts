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
        { enableScripts: true }
      );

      panel.webview.html = getWebviewContent();

      panel.webview.onDidReceiveMessage(async (message) => {
        if (message.command === "chat") {
          const userPromt = message.text;
          let response = "";
          try {
            const streamResponse = await ollama.chat({
              model: "deepseek-r1:1.5b",
              messages: [{ role: "user", content: userPromt }],
              stream: true,
            });

            for await (const part of streamResponse) {
              response += part.message.content;

              panel.webview.postMessage({
                command: "chatResponse",
                text: response,
              });
            }
          } catch (error) {
            panel.webview.postMessage({
              command: "chatResponse",
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
           
        </style>
    </head>
    <body>
        
        <h2>DeepSeek Chat</h2>
        <textarea id="prompt" rows=3 placeholder="Type your message here"></textarea>
        <button id="askBtn">Ask</button>
        <div id="response"></div>


        <script>
            const vscode = acquireVsCodeApi();
            document.getElementById("askBtn").addEventListener("click", () => {
              const text = document.getElementById("prompt").value;
              vscode.postMessage({ command: "chat", text });
            })
            window.addEventListener('message', event => {
              const message = event.data;
              if (message.command === 'chatResponse') {
                document.getElementById("response").innerText = message.text;
              }
            });
        </script>
    </body>
    </html>`;
}

export function deactivate() {}
