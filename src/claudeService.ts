import Anthropic from '@anthropic-ai/sdk';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export class ClaudeService {
  private client: Anthropic | null = null;
  private systemPrompt: string = '';

  constructor(private extensionUri: vscode.Uri) {
    this.loadSystemPrompt();
  }

  /**
   * Load system prompt from markdown file
   */
  private loadSystemPrompt() {
    try {
      const promptPath = path.join(
        this.extensionUri.fsPath,
        'prompts',
        'system-prompt.md'
      );
      this.systemPrompt = fs.readFileSync(promptPath, 'utf-8');
    } catch (error) {
      console.error('Failed to load system prompt:', error);
      this.systemPrompt = 'You are a helpful coding tutor for bootcamp students.';
    }
  }

  /**
   * Initialize or reinitialize the Anthropic client with current API key
   */
  private initializeClient(): boolean {
    const config = vscode.workspace.getConfiguration('fractalTutor');
    const apiKey = config.get<string>('apiKey');

    if (!apiKey || apiKey.trim() === '') {
      return false;
    }

    this.client = new Anthropic({
      apiKey: apiKey.trim(),
    });

    return true;
  }

  /**
   * Send a message to Claude and get a response
   *
   * @param messages - Conversation history
   * @returns Claude's response or error message
   */
  async chat(messages: Message[]): Promise<string> {
    // Ensure client is initialized
    if (!this.client && !this.initializeClient()) {
      return this.getApiKeyErrorMessage();
    }

    const config = vscode.workspace.getConfiguration('fractalTutor');
    const model = config.get<string>('model') || 'claude-sonnet-4-20250514';
    const maxTokens = config.get<number>('maxTokens') || 4096;
    const temperature = config.get<number>('temperature') || 1.0;

    try {
      // Convert our Message format to Anthropic's format
      const anthropicMessages: Anthropic.MessageParam[] = messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      const response = await this.client!.messages.create({
        model,
        max_tokens: maxTokens,
        temperature,
        system: this.systemPrompt,
        messages: anthropicMessages,
      });

      // Extract text content from response
      const textContent = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map(block => block.text)
        .join('\n');

      return textContent;
    } catch (error: any) {
      console.error('Claude API error:', error);
      return this.formatError(error);
    }
  }

  /**
   * Format error messages for display to user
   */
  private formatError(error: any): string {
    if (error.status === 401) {
      return '❌ Invalid API key. Please check your Fractal Tutor settings.';
    }

    if (error.status === 429) {
      return '⏸️  Rate limit reached. Please wait a moment and try again.';
    }

    if (error.status === 500 || error.status === 529) {
      return '⚠️  Anthropic service is experiencing issues. Please try again in a moment.';
    }

    if (error.message?.includes('overloaded')) {
      return '⏸️  Claude is overloaded right now. Please try again in a few seconds.';
    }

    return `❌ Error: ${error.message || 'Unknown error occurred'}`;
  }

  /**
   * Message to show when API key is not configured
   */
  private getApiKeyErrorMessage(): string {
    return `⚙️  **API Key Required**

To use Fractal Tutor, you need to configure your Anthropic API key:

1. Get an API key from https://console.anthropic.com/
2. Open VSCode Settings (Cmd+,)
3. Search for "Fractal Tutor"
4. Enter your API key in "Fractal Tutor: Api Key"

Then reload the extension and try again!`;
  }

  /**
   * Reload the system prompt (useful for development/testing)
   */
  reloadSystemPrompt() {
    this.loadSystemPrompt();
  }
}
