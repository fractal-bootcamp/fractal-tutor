import React from 'react';
import { ConversationMetadata } from '../conversationManager';

interface ConversationSelectorProps {
  conversations: ConversationMetadata[];
  currentConversationId: string | null;
  onSwitchConversation: (conversationId: string) => void;
  onCreateConversation: () => void;
}

export const ConversationSelector: React.FC<ConversationSelectorProps> = ({
  conversations,
  currentConversationId,
  onSwitchConversation,
  onCreateConversation,
}) => {
  return (
    <div className="flex gap-2 mb-3 pb-3 pt-3 px-3 border-b border-[var(--vscode-panel-border)] flex-shrink-0">
      <select
        value={currentConversationId || ''}
        onChange={(e) => onSwitchConversation(e.target.value)}
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
        onClick={onCreateConversation}
        className="px-3 py-1 rounded bg-[var(--vscode-button-background)] text-[var(--vscode-button-foreground)] hover:bg-[var(--vscode-button-hoverBackground)]"
        title="New conversation"
      >
        +
      </button>
    </div>
  );
};
