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
} from '../shared/rpc';
import { Conversation, ConversationMetadata } from '../conversationManager';

declare const acquireVsCodeApi: () => any;
const vscode = acquireVsCodeApi();

/**
 * RPC Client - implements TutorAPI by sending messages to extension host
 */
class RPCClient implements TutorAPI {
  private pendingRequests = new Map<string, { resolve: Function; reject: Function }>();
  private requestId = 0;

  constructor() {
    // Listen for RPC responses
    window.addEventListener('message', (event: MessageEvent) => {
      const msg = event.data;
      if (msg.type === 'rpc-response') {
        this.handleResponse(msg as RPCResponse);
      }
    });
  }

  private handleResponse(response: RPCResponse) {
    const pending = this.pendingRequests.get(response.id);
    if (pending) {
      this.pendingRequests.delete(response.id);
      if (response.error) {
        pending.reject(new Error(response.error));
      } else {
        pending.resolve(response.result);
      }
    }
  }

  private call<T>(method: keyof TutorAPI, args: any): Promise<T> {
    return new Promise((resolve, reject) => {
      const id = `rpc-${this.requestId++}`;
      this.pendingRequests.set(id, { resolve, reject });

      const request: RPCRequest = {
        type: 'rpc-request',
        id,
        method,
        args,
      };

      vscode.postMessage(request);
    });
  }

  async createConversation(args: CreateConversationArgs): Promise<string> {
    return this.call('createConversation', args);
  }

  async listConversations(args: ListConversationsArgs): Promise<ConversationMetadata[]> {
    return this.call('listConversations', args);
  }

  async loadConversation(args: LoadConversationArgs): Promise<Conversation> {
    return this.call('loadConversation', args);
  }

  async deleteConversation(args: DeleteConversationArgs): Promise<void> {
    return this.call('deleteConversation', args);
  }

  async sendMessage(args: SendMessageArgs): Promise<string> {
    return this.call('sendMessage', args);
  }

  async saveTranscript(args: SaveTranscriptArgs): Promise<void> {
    return this.call('saveTranscript', args);
  }

  async saveUIState(args: SaveUIStateArgs): Promise<void> {
    return this.call('saveUIState', args);
  }

  async loadUIState(args: LoadUIStateArgs): Promise<UIState | null> {
    return this.call('loadUIState', args);
  }
}

export const api = new RPCClient();
