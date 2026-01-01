import * as vscode from 'vscode';
import { ContextGatherer } from './contextGatherer';
import { ClaudeService } from './claudeService';
import { ConversationManager } from './conversationManager';
import { RPCServer } from './rpcServer';
import { RPCRequest } from './shared/rpc';

export class ChatViewProvider implements vscode.WebviewViewProvider {
  private view?: vscode.WebviewView;
  private claudeService: ClaudeService;
  private conversationStore?: ConversationManager;
  private rpcServer?: RPCServer;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly contextGatherer: ContextGatherer
  ) {
    this.claudeService = new ClaudeService(extensionUri, contextGatherer);
    this.initializeConversationStore();
  }

  private async initializeConversationStore() {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (workspaceFolder) {
      this.conversationStore = new ConversationManager(workspaceFolder.uri.fsPath);
      await this.conversationStore.initialize();
    }
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    token: vscode.CancellationToken
  ) {
    this.view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri],
    };

    webviewView.webview.html = this.getHtmlForWebview(webviewView.webview);

    // Initialize RPC server
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (this.conversationStore && workspaceFolder) {
      this.rpcServer = new RPCServer(
        this.conversationStore,
        this.claudeService,
        webviewView.webview,
        workspaceFolder.uri.fsPath
      );
    }

    // Handle RPC requests from the webview
    webviewView.webview.onDidReceiveMessage(async (data) => {
      if (data.type === 'rpc-request' && this.rpcServer) {
        await this.rpcServer.handleRequest(data as RPCRequest);
      }
    });
  }

  private getHtmlForWebview(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'dist', 'main.js')
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'dist', 'styles.css')
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
