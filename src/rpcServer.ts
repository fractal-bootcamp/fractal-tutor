import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import {
  TutorAPI,
  RPCRequest,
  RPCResponse,
  CreateConversationArgs,
  ListConversationsArgs,
  LoadConversationArgs,
  DeleteConversationArgs,
  SendMessageArgs,
  SaveTranscriptArgs,
  SaveUIStateArgs,
  LoadUIStateArgs,
  UIState,
} from './shared/rpc';
import { ConversationManager, Conversation, ConversationMetadata } from './conversationManager';
import { ClaudeService } from './claudeService';

/**
 * RPC Server - handles RPC requests from webview
 */
export class RPCServer implements TutorAPI {
  constructor(
    private conversationStore: ConversationManager,
    private claudeService: ClaudeService,
    private webview: vscode.Webview,
    private workspaceRoot: string
  ) {}

  /**
   * Start listening for RPC requests
   */
  listen() {
    // This will be called from chatViewProvider
    // The actual listener setup happens in chatViewProvider.resolveWebviewView
  }

  /**
   * Handle an incoming RPC request
   */
  async handleRequest(request: RPCRequest): Promise<void> {
    try {
      const result = await this.dispatch(request.method, request.args);
      const response: RPCResponse = {
        type: 'rpc-response',
        id: request.id,
        result,
      };
      this.webview.postMessage(response);
    } catch (error: any) {
      const response: RPCResponse = {
        type: 'rpc-response',
        id: request.id,
        error: error.message || 'Unknown error',
      };
      this.webview.postMessage(response);
    }
  }

  private async dispatch(method: keyof TutorAPI, args: any): Promise<any> {
    switch (method) {
      case 'createConversation':
        return this.createConversation(args);
      case 'listConversations':
        return this.listConversations(args);
      case 'loadConversation':
        return this.loadConversation(args);
      case 'deleteConversation':
        return this.deleteConversation(args);
      case 'sendMessage':
        return this.sendMessage(args);
      case 'saveTranscript':
        return this.saveTranscript(args);
      case 'saveUIState':
        return this.saveUIState(args);
      case 'loadUIState':
        return this.loadUIState(args);
      default:
        throw new Error(`Unknown method: ${method}`);
    }
  }

  // API Implementation
  async createConversation(args: CreateConversationArgs): Promise<string> {
    const conversation = await this.conversationStore.create();
    return conversation.id;
  }

  async listConversations(args: ListConversationsArgs): Promise<ConversationMetadata[]> {
    return this.conversationStore.list();
  }

  async loadConversation(args: LoadConversationArgs): Promise<Conversation> {
    const conversation = await this.conversationStore.load(args.id);
    if (!conversation) {
      throw new Error('Conversation not found');
    }
    return conversation;
  }

  async deleteConversation(args: DeleteConversationArgs): Promise<void> {
    await this.conversationStore.delete(args.id);
  }

  async sendMessage(args: SendMessageArgs): Promise<string> {
    const conversation = await this.conversationStore.load(args.conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // Add user message
    conversation.messages.push({
      role: 'user',
      content: args.message,
    });
    await this.conversationStore.save(conversation);

    // Get AI response
    const response = await this.claudeService.chat(conversation.messages);

    // Add assistant message
    conversation.messages.push({
      role: 'assistant',
      content: response,
    });
    await this.conversationStore.save(conversation);

    return response;
  }

  async saveTranscript(args: SaveTranscriptArgs): Promise<void> {
    const conversation = await this.conversationStore.load(args.conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // Create .fractal directory if it doesn't exist
    const fractalDir = path.join(this.workspaceRoot, '.fractal');
    await fs.mkdir(fractalDir, { recursive: true });

    // Build the transcript with system prompt and conversation
    const transcript = {
      conversationId: conversation.id,
      createdAt: conversation.createdAt,
      savedAt: new Date().toISOString(),
      systemPrompt: this.claudeService.getSystemPrompt(),
      messages: conversation.messages,
    };

    // Save to transcript.json (overwrites previous)
    const transcriptPath = path.join(fractalDir, 'transcript.json');
    await fs.writeFile(transcriptPath, JSON.stringify(transcript, null, 2), 'utf-8');

    vscode.window.showInformationMessage(
      `Transcript saved to ${path.relative(this.workspaceRoot, transcriptPath)}`
    );
  }

  async saveUIState(args: SaveUIStateArgs): Promise<void> {
    // Create .fractal directory if it doesn't exist
    const fractalDir = path.join(this.workspaceRoot, '.fractal');
    await fs.mkdir(fractalDir, { recursive: true });

    // Save UI state to state.json
    const statePath = path.join(fractalDir, 'state.json');
    await fs.writeFile(statePath, JSON.stringify(args.state, null, 2), 'utf-8');
  }

  async loadUIState(args: LoadUIStateArgs): Promise<UIState | null> {
    const statePath = path.join(this.workspaceRoot, '.fractal', 'state.json');

    try {
      const content = await fs.readFile(statePath, 'utf-8');
      return JSON.parse(content) as UIState;
    } catch (error) {
      // Return null if file doesn't exist or can't be read
      return null;
    }
  }
}
