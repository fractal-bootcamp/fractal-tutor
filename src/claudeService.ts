import Anthropic from '@anthropic-ai/sdk';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { TOOL_DEFINITIONS, executeTool } from './tools';
import { ContextGatherer } from './contextGatherer';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface DetailedMessage {
  role: 'user' | 'assistant';
  content: string | Anthropic.ContentBlock[] | Anthropic.ToolResultBlockParam[];
  timestamp: string;
}

export class ClaudeService {
  private client: Anthropic | null = null;
  private systemPrompt: string = '';
  private fullConversationHistory: DetailedMessage[] = [];

  constructor(
    private extensionUri: vscode.Uri,
    private contextGatherer: ContextGatherer
  ) {
    this.loadSystemPrompt();
  }

  public getFullConversationHistory(): DetailedMessage[] {
    return this.fullConversationHistory;
  }

  public getSystemPrompt(): string {
    return this.systemPrompt;
  }

  public clearHistory(): void {
    this.fullConversationHistory = [];
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
      console.log("loaded system prompt: " + promptPath)
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
   * Send a message to Claude and get a response, handling tool use
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
    const model = 'claude-opus-4-5';
    const maxTokens = config.get<number>('maxTokens') || 4096;
    const temperature = config.get<number>('temperature') || 1.0;

    try {
      // Convert our Message format to Anthropic's format
      const anthropicMessages: Anthropic.MessageParam[] = messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      // Track the user message in detailed history
      if (messages.length > 0) {
        const lastMessage = messages[messages.length - 1];
        if (lastMessage.role === 'user') {
          this.fullConversationHistory.push({
            role: 'user',
            content: lastMessage.content,
            timestamp: new Date().toISOString(),
          });
        }
      }

      const req = {
        model,
        max_tokens: maxTokens,
        temperature,
        system: this.systemPrompt,
        messages: anthropicMessages,
        tools: TOOL_DEFINITIONS as any,
      }

      console.log("Sending to Anthropic: " + JSON.stringify(req))

      let response = await this.client!.messages.create(req);

      // Handle tool use loop
      while (response.stop_reason === 'tool_use') {
        const toolUseBlocks = response.content.filter(
          (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
        );

        // Track assistant's tool use in detailed history
        this.fullConversationHistory.push({
          role: 'assistant',
          content: response.content,
          timestamp: new Date().toISOString(),
        });

        // Execute all tool calls
        const toolResults: Anthropic.ToolResultBlockParam[] = [];

        for (const toolUse of toolUseBlocks) {
          const result = await executeTool(
            toolUse.name,
            toolUse.input,
            this.contextGatherer
          );

          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: JSON.stringify(result),
          });

          console.log(`Executing tool: ${toolUse.name}`, toolUse.input, result);

        }

        // Track tool results in detailed history
        this.fullConversationHistory.push({
          role: 'user',
          content: toolResults,
          timestamp: new Date().toISOString(),
        });

        // Add assistant's tool use and tool results to conversation
        anthropicMessages.push({
          role: 'assistant',
          content: response.content,
        });

        anthropicMessages.push({
          role: 'user',
          content: toolResults,
        });

        // Continue the conversation with tool results
        response = await this.client!.messages.create({
          model,
          max_tokens: maxTokens,
          temperature,
          system: this.systemPrompt,
          messages: anthropicMessages,
          tools: TOOL_DEFINITIONS as any,
        });
      }

      // Track final assistant response in detailed history
      this.fullConversationHistory.push({
        role: 'assistant',
        content: response.content,
        timestamp: new Date().toISOString(),
      });

      // Extract final text response
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
