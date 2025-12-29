import * as vscode from 'vscode';
import { ContextGatherer } from './contextGatherer';
import { getOutputPreview } from './terminalOutputCleaner';

export class ChatViewProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _contextGatherer: ContextGatherer
  ) { }

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
      }
    });
  }

  private async _handleUserMessage(message: string) {
    // Gather context
    const context = this._contextGatherer.getAllContext();

    // TODO: Implement API call to Claude
    // For now, echo back with context summary
    const runningCount = context.terminal.runningCommands.length;
    const completedCount = context.terminal.recentExecutions.length;
    const terminalInfo = context.terminal.shellIntegrationAvailable
      ? `Shell Integration ✓ - ${runningCount} running, ${completedCount} completed`
      : 'Shell Integration ✗ - terminal output unavailable';

    let contextSummary = `
Context gathered:
- Active file: ${context.editor.activeFile?.path || 'none'}
- Cursor: Line ${context.editor.activeFile?.cursorPosition.line || '?'}
- Open tabs: ${context.editor.openTabs.length}
- Unsaved changes: ${context.workspace.unsavedChanges.length}
- Terminal: ${terminalInfo}
    `.trim();

    // Show running commands
    if (context.terminal.runningCommands.length > 0) {
      contextSummary += '\n\n🔄 Running commands:';
      context.terminal.runningCommands.forEach((exec) => {
        const elapsed = Math.floor((Date.now() - exec.startTime.getTime()) / 1000);
        contextSummary += `\n  ${exec.commandLine} (running ${elapsed}s)`;
        if (exec.output) {
          const preview = getOutputPreview(exec.output, true, 200);
          if (preview) {
            contextSummary += `\n    Latest: ${preview}`;
          }
        }
      });
    }

    // Add recent terminal commands if available
    if (context.terminal.recentExecutions.length > 0) {
      contextSummary += '\n\n✅ Recent completed commands:';
      context.terminal.recentExecutions.slice(-5).forEach((exec) => {
        const duration = exec.endTime && exec.startTime
          ? ((exec.endTime.getTime() - exec.startTime.getTime()) / 1000).toFixed(1)
          : '?';
        contextSummary += `\n  ${exec.commandLine} (exit: ${exec.exitCode ?? '?'}, ${duration}s)`;
        if (exec.output) {
          const preview = getOutputPreview(exec.output, false, 150);
          if (preview) {
            contextSummary += `\n    Output: ${preview}`;
          }
        }
      });
    }

    contextSummary += `\n\nYour message: ${message}`;

    this._view?.webview.postMessage({
      type: 'receiveMessage',
      message: {
        role: 'assistant',
        content: contextSummary,
      },
    });
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
