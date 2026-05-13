/**
 * AI Chat Message Bubble
 * Renders a single message in the chat panel — user or assistant.
 */

import React from 'react';
import type { AiMessage } from '../../api/aiApi';
import { sanitizeInline } from '../../../../utils/sanitize';
import { MessageActions } from '../../../ai/shared/MessageActions';

interface ChatMessageProps {
  message: AiMessage;
  /** Show a Regenerate button (typically only on the last assistant message). */
  onRegenerate?: () => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, onRegenerate }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`group flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div className={`max-w-[85%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? 'bg-blue-600 text-white rounded-br-md'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-md'
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <AssistantContent content={message.content} />
          )}
          {message.timestamp && (
            <p className={`text-[10px] mt-1 ${isUser ? 'text-blue-200' : 'text-gray-400'}`}>
              {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>
        {!isUser && (
          <MessageActions copyText={message.content} onRegenerate={onRegenerate} />
        )}
      </div>
    </div>
  );
};

/** Parse assistant responses: render markdown-like content with code blocks */
const AssistantContent: React.FC<{ content: string }> = ({ content }) => {
  // Split by code blocks
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-2">
      {parts.map((part, i) => {
        if (part.startsWith('```')) {
          const lines = part.split('\n');
          const lang = lines[0].replace('```', '').trim();
          const code = lines.slice(1, -1).join('\n');
          return (
            <div key={i} className="relative">
              {lang && (
                <span className="absolute top-1 right-2 text-[10px] text-gray-400 font-mono">
                  {lang}
                </span>
              )}
              <pre className="bg-gray-900 text-green-300 text-xs rounded-lg p-3 overflow-x-auto font-mono">
                <code>{code}</code>
              </pre>
            </div>
          );
        }
        return (
          <div key={i} className="whitespace-pre-wrap">
            {part.split('\n').map((line, j) => {
              // Bold
              const boldLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
              // Bullet points
              if (line.match(/^[\s]*[-•*]\s/)) {
                return (
                  <p key={j} className="ml-3" dangerouslySetInnerHTML={{ __html: sanitizeInline(`• ${boldLine.replace(/^[\s]*[-•*]\s/, '')}`) }} />
                );
              }
              return <p key={j} dangerouslySetInnerHTML={{ __html: sanitizeInline(boldLine) }} />;
            })}
          </div>
        );
      })}
    </div>
  );
};
