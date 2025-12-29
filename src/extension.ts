import * as vscode from 'vscode';
import { ChatViewProvider } from './chatViewProvider';
import { ContextGatherer } from './contextGatherer';

export function activate(context: vscode.ExtensionContext) {
  console.log('Fractal Tutor extension is now active');

  const contextGatherer = new ContextGatherer();
  const provider = new ChatViewProvider(context.extensionUri, contextGatherer);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      'fractal-tutor.chatView',
      provider
    )
  );

  // Debug command to show what context we can gather
  context.subscriptions.push(
    vscode.commands.registerCommand('fractal-tutor.showContext', async () => {
      const allContext = contextGatherer.getAllContext();
      const doc = await vscode.workspace.openTextDocument({
        content: JSON.stringify(allContext, null, 2),
        language: 'json',
      });
      await vscode.window.showTextDocument(doc);
    })
  );

  context.subscriptions.push(contextGatherer);
}

export function deactivate() {}
