import * as path from 'path';
import * as fs from 'fs/promises';
import { Message } from './claudeService';

export interface Conversation {
  id: string;
  createdAt: string;
  messages: Message[];
}

export interface ConversationMetadata {
  id: string;
  createdAt: string;
  label: string;
}

/**
 * Manages conversation storage and retrieval
 */
export class ConversationManager {
  private conversationsDir: string;

  constructor(private workspaceRoot: string) {
    this.conversationsDir = path.join(workspaceRoot, '.fractal', 'conversations');
  }

  /**
   * Initialize the conversations directory
   */
  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.conversationsDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create conversations directory:', error);
      throw new Error('Failed to initialize conversation storage');
    }
  }

  /**
   * Generate a new UUID v4
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Create a new conversation
   */
  async create(): Promise<Conversation> {
    const conversation: Conversation = {
      id: this.generateUUID(),
      createdAt: new Date().toISOString(),
      messages: [],
    };

    await this.save(conversation);
    return conversation;
  }

  /**
   * Save a conversation to disk
   */
  async save(conversation: Conversation): Promise<void> {
    try {
      const filePath = path.join(this.conversationsDir, `${conversation.id}.json`);
      await fs.writeFile(filePath, JSON.stringify(conversation, null, 2), 'utf-8');
    } catch (error) {
      console.error(`Failed to save conversation ${conversation.id}:`, error);
      throw new Error('Failed to save conversation');
    }
  }

  /**
   * Load a conversation from disk
   */
  async load(id: string): Promise<Conversation | null> {
    try {
      const filePath = path.join(this.conversationsDir, `${id}.json`);
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.error(`Failed to load conversation ${id}:`, error);
      return null;
    }
  }

  /**
   * List all conversations
   */
  async list(): Promise<ConversationMetadata[]> {
    try {
      const files = await fs.readdir(this.conversationsDir);
      const conversations: ConversationMetadata[] = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          const id = file.replace('.json', '');
          const conversation = await this.load(id);
          if (conversation) {
            conversations.push({
              id: conversation.id,
              createdAt: conversation.createdAt,
              label: this.generateLabel(conversation),
            });
          }
        }
      }

      // Sort by creation time (newest first)
      conversations.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      return conversations;
    } catch (error) {
      console.error('Failed to list conversations:', error);
      return [];
    }
  }

  /**
   * Generate a label for a conversation
   */
  private generateLabel(conversation: Conversation): string {
    const date = new Date(conversation.createdAt);
    const formattedDate = date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    return formattedDate;
  }

  /**
   * Delete a conversation
   */
  async delete(id: string): Promise<void> {
    try {
      const filePath = path.join(this.conversationsDir, `${id}.json`);
      await fs.unlink(filePath);
    } catch (error) {
      console.error(`Failed to delete conversation ${id}:`, error);
      throw new Error('Failed to delete conversation');
    }
  }
}
