/**
 * Conversation List Sidebar
 * Shows previous AI conversations with load/delete actions and search.
 */

import React, { useState, useCallback } from 'react';
import type { ConversationSummary } from '../../api/aiApi';

interface ConversationListProps {
  conversations: ConversationSummary[];
  activeId: string | null;
  isLoading: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
  onSearch?: (query: string) => void;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  activeId,
  isLoading,
  onSelect,
  onDelete,
  onNew,
  onSearch,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = useCallback((value: string) => {
    setSearchQuery(value);
    if (debounceTimer) clearTimeout(debounceTimer);
    const timer = setTimeout(() => {
      onSearch?.(value.trim());
    }, 300);
    setDebounceTimer(timer);
  }, [debounceTimer, onSearch]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          History
        </h3>
        <button
          onClick={onNew}
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
        >
          + New Chat
        </button>
      </div>

      {/* Search */}
      {onSearch && (
        <div className="px-2 py-1.5 border-b border-gray-200 dark:border-gray-700">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search chats..."
            className="w-full text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-center text-sm text-gray-400">Loading...</div>
        ) : conversations.length === 0 ? (
          <div className="p-4 text-center text-sm text-gray-400">
            {searchQuery ? 'No matches found.' : (
              <>
                No conversations yet.
                <br />
                Start chatting to create one!
              </>
            )}
          </div>
        ) : (
          <div className="py-1">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className={`group flex items-center px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 ${
                  activeId === conv.id ? 'bg-blue-50 dark:bg-blue-900/20 border-l-2 border-blue-600' : ''
                }`}
                onClick={() => onSelect(conv.id)}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {conv.title}
                  </p>
                  <p className="text-[10px] text-gray-400">
                    {new Date(conv.updatedAt).toLocaleDateString()}
                    {conv.messageCount > 0 && ` · ${conv.messageCount} msgs`}
                  </p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(conv.id); }}
                  className="opacity-0 group-hover:opacity-100 ml-2 text-gray-400 hover:text-red-500 transition-opacity"
                  title="Delete conversation"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
