import React, { useState, useEffect, useRef } from 'react';

declare const acquireVsCodeApi: () => any;
const vscode = acquireVsCodeApi();

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export const ChatUI: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Handle messages from extension
    const messageHandler = (event: MessageEvent) => {
      const message = event.data;
      switch (message.type) {
        case 'receiveMessage':
          setMessages((prev) => [...prev, message.message]);
          setIsLoading(false);
          break;
      }
    };

    window.addEventListener('message', messageHandler);
    return () => window.removeEventListener('message', messageHandler);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    vscode.postMessage({
      type: 'sendMessage',
      message: input,
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSaveTranscript = () => {
    vscode.postMessage({
      type: 'saveTranscript',
    });
  };

  return (
    <div className="flex flex-col h-screen p-3">
      <div className="flex-1 overflow-y-auto py-2 flex flex-col gap-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center opacity-60">
            <h2 className="text-xl font-bold mb-2">Welcome to Fractal Tutor</h2>
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
            disabled={messages.length === 0}
            className="px-4 py-2 rounded bg-[var(--vscode-button-secondaryBackground)] text-[var(--vscode-button-secondaryForeground)] hover:bg-[var(--vscode-button-secondaryHoverBackground)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save Transcript
          </button>
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="px-4 py-2 rounded bg-[var(--vscode-button-background)] text-[var(--vscode-button-foreground)] hover:bg-[var(--vscode-button-hoverBackground)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};
