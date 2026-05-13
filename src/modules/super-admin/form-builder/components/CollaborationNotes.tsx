/**
 * CollaborationNotes – Internal team notes/comments for a form.
 * Stored in localStorage per form ID. Team members can leave notes
 * about design decisions, TODOs, and feedback.
 */

import { useState, useEffect, useCallback } from 'react';
import { generateId } from '../types';
import type { FormNote } from '../types';

interface Props {
  formId: string;
}

const STORAGE_KEY = (formId: string) => `fb_notes_${formId}`;

export default function CollaborationNotes({ formId }: Props) {
  const [notes, setNotes] = useState<FormNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  // Load notes from localStorage
  useEffect(() => {
    if (!formId) return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY(formId));
      if (stored) setNotes(JSON.parse(stored));
    } catch { /* ignore */ }
  }, [formId]);

  // Persist notes
  const persist = useCallback((updated: FormNote[]) => {
    setNotes(updated);
    try {
      localStorage.setItem(STORAGE_KEY(formId), JSON.stringify(updated));
    } catch { /* ignore */ }
  }, [formId]);

  const addNote = () => {
    const text = newNote.trim();
    if (!text) return;
    const note: FormNote = {
      id: generateId(),
      text,
      author: 'Current User',
      createdAt: new Date().toISOString(),
    };
    persist([note, ...notes]);
    setNewNote('');
  };

  const deleteNote = (id: string) => {
    persist(notes.filter((n) => n.id !== id));
  };

  const startEdit = (note: FormNote) => {
    setEditingId(note.id);
    setEditText(note.text);
  };

  const saveEdit = () => {
    if (!editingId) return;
    persist(notes.map((n) => n.id === editingId ? { ...n, text: editText.trim() || n.text } : n));
    setEditingId(null);
    setEditText('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const timeAgo = (iso: string): string => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  if (!formId) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center text-gray-400 dark:text-gray-500">
        <span className="mb-2 text-3xl">📝</span>
        <p className="text-sm">Select a form to view notes.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Team Notes
        </h3>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-gray-700 dark:text-gray-400">
          {notes.length}
        </span>
      </div>

      {/* New note input */}
      <div className="space-y-2">
        <textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Add a note about this form…"
          rows={3}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-700 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              addNote();
            }
          }}
        />
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-gray-400">Ctrl+Enter to post</span>
          <button
            type="button"
            onClick={addNote}
            disabled={!newNote.trim()}
            className="rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-40 transition"
          >
            Add Note
          </button>
        </div>
      </div>

      {/* Notes list */}
      <div className="space-y-2">
        {notes.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-200 py-6 text-center text-xs text-gray-400 dark:border-gray-600">
            No notes yet. Add the first one!
          </div>
        ) : (
          notes.map((note) => (
            <div
              key={note.id}
              className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-600 dark:bg-gray-700/40"
            >
              {editingId === note.id ? (
                <div className="space-y-2">
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    rows={3}
                    className="w-full rounded-md border border-blue-300 bg-white px-2.5 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-blue-600 dark:bg-gray-700 dark:text-gray-200"
                    autoFocus
                  />
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={saveEdit}
                      className="rounded-md bg-blue-600 px-2.5 py-1 text-[10px] font-medium text-white hover:bg-blue-700"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="rounded-md border border-gray-300 px-2.5 py-1 text-[10px] font-medium text-gray-500 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-xs text-gray-700 dark:text-gray-200 whitespace-pre-wrap">
                    {note.text}
                  </p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[10px] text-gray-400 dark:text-gray-500">
                      {note.author} · {timeAgo(note.createdAt)}
                    </span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => startEdit(note)}
                        className="rounded px-1.5 py-0.5 text-[10px] text-gray-400 hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-gray-600 dark:hover:text-gray-300"
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteNote(note.id)}
                        className="rounded px-1.5 py-0.5 text-[10px] text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
