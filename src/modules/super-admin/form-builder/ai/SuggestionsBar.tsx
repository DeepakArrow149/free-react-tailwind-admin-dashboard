/**
 * AI Suggestions Bar
 * Renders clickable follow-up suggestion chips from AI responses.
 */

import React from 'react';

interface SuggestionsBarProps {
  suggestions: string[];
  onSelect: (suggestion: string) => void;
}

export const SuggestionsBar: React.FC<SuggestionsBarProps> = ({ suggestions, onSelect }) => {
  if (suggestions.length === 0) return null;

  return (
    <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-800">
      <p className="text-[10px] text-gray-400 mb-1.5 uppercase tracking-wider">Suggestions</p>
      <div className="flex flex-wrap gap-1.5">
        {suggestions.map((sug, i) => (
          <button
            key={i}
            onClick={() => onSelect(sug)}
            className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2.5 py-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors truncate max-w-50"
            title={sug}
          >
            {sug}
          </button>
        ))}
      </div>
    </div>
  );
};
