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

// API interface
export interface TutorAPI {
  createConversation(args: CreateConversationArgs): Promise<string>;
  listConversations(args: ListConversationsArgs): Promise<ConversationMetadata[]>;
  loadConversation(args: LoadConversationArgs): Promise<Conversation>;
  deleteConversation(args: DeleteConversationArgs): Promise<void>;
  sendMessage(args: SendMessageArgs): Promise<string>;
  saveTranscript(args: SaveTranscriptArgs): Promise<void>;
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
