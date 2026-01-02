import React from 'react';
import { MarkdownRenderer } from './MarkdownRenderer';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ConversationMessageProps {
  message: Message;
}

export const ConversationMessage: React.FC<ConversationMessageProps> = ({ message }) => {
  return (
    <div
      className={`flex flex-col gap-1 p-3 rounded ${
        message.role === 'user'
          ? 'bg-[var(--vscode-editor-inactiveSelectionBackground)]'
          : 'bg-[var(--vscode-textBlockQuote-background)]'
      }`}
    >
      <div className="text-sm font-bold opacity-80 mb-1">
        {message.role === 'user' ? 'You' : 'Tutor'}
      </div>
      <div className="leading-relaxed">
        {message.role === 'assistant' ? (
          <MarkdownRenderer content={message.content} />
        ) : (
          <div className="whitespace-pre-wrap">{message.content}</div>
        )}
      </div>
    </div>
  );
};
