import React, { useRef, useEffect } from 'react';
import { ConversationMessage } from './ConversationMessage';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatViewProps {
  messages: Message[];
  isLoading: boolean;
  currentConversationId: string | null;
}

export const ChatView: React.FC<ChatViewProps> = ({
  messages,
  isLoading,
  currentConversationId,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto py-2 px-3 flex flex-col gap-4 min-h-0">
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
        <ConversationMessage key={idx} message={msg} />
      ))}
      {isLoading && (
        <div className="flex flex-col gap-1 p-2 rounded bg-[var(--vscode-textBlockQuote-background)]">
          <div className="text-sm font-bold opacity-80">Tutor</div>
          <div className="italic opacity-70">Thinking...</div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
};
