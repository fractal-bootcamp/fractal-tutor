import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism';

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  try {
    return (
      <div className="markdown-content">
        <ReactMarkdown
          components={{
            code(props) {
              const { children, className, node, ...rest } = props
              const match = /language-(\w+)/.exec(className || '')
              return match ? (
                <SyntaxHighlighter
                  {...rest}
                  PreTag="div"
                  children={String(children).replace(/\n$/, '')}
                  language={match[1]}
                  style={vscDarkPlus}
                />
              ) : (
                <code {...rest} className={className}>
                  {children}
                </code>
              )
            },
            p({ children }) {
              return <p className="mb-3 last:mb-0">{children}</p>;
            },
            ul({ children }) {
              return <ul className="list-disc list-inside mb-3 space-y-1">{children}</ul>;
            },
            ol({ children }) {
              return <ol className="list-decimal list-inside mb-3 space-y-1">{children}</ol>;
            },
            li({ children }) {
              return <li className="ml-2">{children}</li>;
            },
            h1({ children }) {
              return <h1 className="text-xl font-bold mb-2 mt-4 first:mt-0">{children}</h1>;
            },
            h2({ children }) {
              return <h2 className="text-lg font-bold mb-2 mt-3 first:mt-0">{children}</h2>;
            },
            h3({ children }) {
              return <h3 className="text-base font-bold mb-2 mt-2 first:mt-0">{children}</h3>;
            },
            blockquote({ children }) {
              return (
                <blockquote className="border-l-4 border-[var(--vscode-textBlockQuote-border)] bg-[var(--vscode-textBlockQuote-background)] pl-3 py-2 my-2 italic">
                  {children}
                </blockquote>
              );
            },
            a({ href, children }) {
              return (
                <a
                  href={href}
                  className="text-[var(--vscode-textLink-foreground)] hover:text-[var(--vscode-textLink-activeForeground)] underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {children}
                </a>
              );
            },
            strong({ children }) {
              return <strong className="font-bold">{children}</strong>;
            },
            em({ children }) {
              return <em className="italic">{children}</em>;
            },
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    );
  } catch (error) {
    console.error('MarkdownRenderer error:', error);
    return <div className="whitespace-pre-wrap">{content}</div>;
  }
};
