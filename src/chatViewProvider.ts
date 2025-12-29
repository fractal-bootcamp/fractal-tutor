import * as vscode from 'vscode';
import { ContextGatherer } from './contextGatherer';
import { getOutputPreview } from './terminalOutputCleaner';
import { ClaudeService, Message } from './claudeService';

export class ChatViewProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;
  private _claudeService: ClaudeService;
  private _conversationHistory: Message[] = [];

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _contextGatherer: ContextGatherer
  ) {
    this._claudeService = new ClaudeService(_extensionUri);
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    // Handle messages from the webview
    webviewView.webview.onDidReceiveMessage(async (data) => {
      switch (data.type) {
        case 'sendMessage':
          await this._handleUserMessage(data.message);
          break;
        case 'clearConversation':
          this._conversationHistory = [];
          break;
      }
    });
  }

  private async _handleUserMessage(message: string) {
    // Add user message to conversation history
    this._conversationHistory.push({
      role: 'user',
      content: message,
    });

    try {
      // Call Claude API
      const response = await this._claudeService.chat(this._conversationHistory);

      // Add assistant response to history
      this._conversationHistory.push({
        role: 'assistant',
        content: response,
      });

      // Send response to webview
      this._view?.webview.postMessage({
        type: 'receiveMessage',
        message: {
          role: 'assistant',
          content: response,
        },
      });
    } catch (error) {
      // Send error message to webview
      this._view?.webview.postMessage({
        type: 'receiveMessage',
        message: {
          role: 'assistant',
          content: `❌ Error communicating with Claude: ${error}`,
        },
      });
    }
  }

  private _getHtmlForWebview(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'dist', 'main.js')
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'dist', 'styles.css')
    );

    const nonce = getNonce();

    return `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link href="${styleUri}" rel="stylesheet">
        <title>Fractal Tutor</title>
      </head>
      <body>
        <div id="root"></div>
        <script nonce="${nonce}" src="${scriptUri}"></script>
      </body>
      </html>`;
  }
}

function getNonce() {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
