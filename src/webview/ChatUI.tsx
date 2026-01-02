import React, { useState, useEffect } from 'react';
import { api } from './rpcClient';
import { ConversationSelector } from './ConversationSelector';
import { ChatView } from './ChatView';
import { ConversationMetadata } from '../conversationManager';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export const ChatUI: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversations, setConversations] = useState<ConversationMetadata[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);

  useEffect(() => {
    loadConversationList();
    loadPersistedState();
  }, []);

  const loadConversationList = async () => {
    try {
      const convs = await api.listConversations({});
      setConversations(convs);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  };

  const loadPersistedState = async () => {
    try {
      const state = await api.loadUIState({});
      if (state) {
        if (state.currentConversationId) {
          // Load the conversation
          const conv = await api.loadConversation({ id: state.currentConversationId });
          setCurrentConversationId(conv.id);
          setMessages(conv.messages);
        }
        if (state.input) {
          setInput(state.input);
        }
      }
    } catch (error) {
      console.error('Failed to load persisted state:', error);
    }
  };

  const persistState = async () => {
    try {
      await api.saveUIState({
        state: {
          currentConversationId,
          input,
        },
      });
    } catch (error) {
      console.error('Failed to persist state:', error);
    }
  };

  // Persist state whenever input or currentConversationId changes
  useEffect(() => {
    persistState();
  }, [input, currentConversationId]);


  const handleSend = async () => {
    if (!input.trim() || isLoading || !currentConversationId) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
    };

    const messageText = input;
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await api.sendMessage({
        conversationId: currentConversationId,
        message: messageText,
      });

      setMessages((prev) => [...prev, { role: 'assistant', content: response }]);
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `❌ Error: ${error}` },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCreateConversation = async () => {
    try {
      const newId = await api.createConversation({});
      setCurrentConversationId(newId);
      setMessages([]);
      await loadConversationList();
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  };

  const handleSwitchConversation = async (conversationId: string) => {
    try {
      const conv = await api.loadConversation({ id: conversationId });
      setCurrentConversationId(conv.id);
      setMessages(conv.messages);
    } catch (error) {
      console.error('Failed to load conversation:', error);
    }
  };

  const handleSaveTranscript = async () => {
    if (!currentConversationId) return;

    try {
      await api.saveTranscript({ conversationId: currentConversationId });
    } catch (error) {
      console.error('Failed to save transcript:', error);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <ConversationSelector
        conversations={conversations}
        currentConversationId={currentConversationId}
        onSwitchConversation={handleSwitchConversation}
        onCreateConversation={handleCreateConversation}
      />

      <ChatView
        messages={messages}
        isLoading={isLoading}
        currentConversationId={currentConversationId}
      />

      <div className="flex flex-col gap-2 pt-3 pb-3 px-3 border-t border-[var(--vscode-panel-border)] flex-shrink-0">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ask a question..."
          rows={3}
          disabled={isLoading}
          className="w-full p-2 resize-none rounded border border-[var(--vscode-input-border)] bg-[var(--vscode-input-background)] text-[var(--vscode-input-foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--vscode-focusBorder)]"
        />
        <div className="flex gap-2 self-end">
          <button
            onClick={handleSaveTranscript}
            disabled={!currentConversationId || messages.length === 0}
            className="px-4 py-2 rounded bg-[var(--vscode-button-secondaryBackground)] text-[var(--vscode-button-secondaryForeground)] hover:bg-[var(--vscode-button-secondaryHoverBackground)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save Transcript
          </button>
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim() || !currentConversationId}
            className="px-4 py-2 rounded bg-[var(--vscode-button-background)] text-[var(--vscode-button-foreground)] hover:bg-[var(--vscode-button-hoverBackground)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};
