import { Conversation, ConversationMetadata } from '../conversationManager';
import { Message } from '../claudeService';

/**
 * RPC API interface - defines all available remote procedures
 */

// Argument types for each RPC method
export interface CreateConversationArgs {}

export interface ListConversationsArgs {}

export interface LoadConversationArgs {
  id: string;
}

export interface DeleteConversationArgs {
  id: string;
}

export interface SendMessageArgs {
  conversationId: string;
  message: string;
}

export interface SaveTranscriptArgs {
  conversationId: string;
}

export interface UIState {
  currentConversationId: string | null;
  input: string;
}

export interface SaveUIStateArgs {
  state: UIState;
}

export interface LoadUIStateArgs {}

// API interface
export interface TutorAPI {
  createConversation(args: CreateConversationArgs): Promise<string>;
  listConversations(args: ListConversationsArgs): Promise<ConversationMetadata[]>;
  loadConversation(args: LoadConversationArgs): Promise<Conversation>;
  deleteConversation(args: DeleteConversationArgs): Promise<void>;
  sendMessage(args: SendMessageArgs): Promise<string>;
  saveTranscript(args: SaveTranscriptArgs): Promise<void>;
  saveUIState(args: SaveUIStateArgs): Promise<void>;
  loadUIState(args: LoadUIStateArgs): Promise<UIState | null>;
}

// Internal RPC message types
export type RPCRequest = {
  type: 'rpc-request';
  id: string;
  method: keyof TutorAPI;
  args: any;
};

export type RPCResponse = {
  type: 'rpc-response';
  id: string;
  result?: any;
  error?: string;
};
