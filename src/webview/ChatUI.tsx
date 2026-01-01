import React, { useState, useEffect, useRef } from 'react';
import { api } from './rpcClient';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ConversationMetadata {
  id: string;
  createdAt: string;
  label: string;
}

export const ChatUI: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversations, setConversations] = useState<ConversationMetadata[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadConversationList();
  }, []);

  const loadConversationList = async () => {
    try {
      const convs = await api.listConversations({});
      setConversations(convs);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
    <div className="flex flex-col h-screen p-3">
      {/* Conversation selector header */}
      <div className="flex gap-2 mb-3 pb-3 border-b border-[var(--vscode-panel-border)]">
        <select
          value={currentConversationId || ''}
          onChange={(e) => handleSwitchConversation(e.target.value)}
          disabled={conversations.length === 0}
          className="flex-1 px-2 py-1 rounded border border-[var(--vscode-input-border)] bg-[var(--vscode-input-background)] text-[var(--vscode-input-foreground)] disabled:opacity-50"
        >
          {conversations.length === 0 && (
            <option value="">No conversations</option>
          )}
          {conversations.map((conv) => (
            <option key={conv.id} value={conv.id}>
              {conv.label}
            </option>
          ))}
        </select>
        <button
          onClick={handleCreateConversation}
          className="px-3 py-1 rounded bg-[var(--vscode-button-background)] text-[var(--vscode-button-foreground)] hover:bg-[var(--vscode-button-hoverBackground)]"
          title="New conversation"
        >
          +
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-2 flex flex-col gap-4">
        {!currentConversationId && (
          <div className="flex flex-col items-center justify-center h-full text-center opacity-60">
            <h2 className="text-xl font-bold mb-2">Welcome to Fractal Tutor</h2>
            <p>Create a new conversation to get started</p>
          </div>
        )}
        {currentConversationId && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center opacity-60">
            <h2 className="text-xl font-bold mb-2">New Conversation</h2>
            <p>Ask me anything about your code!</p>
          </div>
        )}
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex flex-col gap-1 p-2 rounded ${
              msg.role === 'user'
                ? 'bg-[var(--vscode-editor-inactiveSelectionBackground)]'
                : 'bg-[var(--vscode-textBlockQuote-background)]'
            }`}
          >
            <div className="text-sm font-bold opacity-80">
              {msg.role === 'user' ? 'You' : 'Tutor'}
            </div>
            <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
          </div>
        ))}
        {isLoading && (
          <div className="flex flex-col gap-1 p-2 rounded bg-[var(--vscode-textBlockQuote-background)]">
            <div className="text-sm font-bold opacity-80">Tutor</div>
            <div className="italic opacity-70">Thinking...</div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="flex flex-col gap-2 pt-3 border-t border-[var(--vscode-panel-border)]">
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
