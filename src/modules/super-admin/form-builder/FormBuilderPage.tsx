/**
 * FormBuilderPage – Main page for the No-Code Form Builder
 *
 * Inspired by Odoo Studio:
 * - Left sidebar: Field Palette (drag source)
 * - Center: Form Canvas (drop target, visual editor)
 * - Right sidebar: Field Properties / Form Settings
 * - Toggle between editor and live preview
 *
 * Accessed at: /super-admin/form-builder
 */

import { useEffect, useCallback, useState, useRef, lazy, Suspense } from 'react';
import { PageMeta } from '@/components/common';
import { useFormBuilderStore } from './store';
import type { FormDefinition } from './types';
import { usePresence } from '../../presence/usePresence';
import { PresenceAvatars } from '../../presence/PresenceAvatars';
import FieldPalette from './components/FieldPalette';
import FieldProperties from './components/FieldProperties';
import FormSettingsPanel from './components/FormSettingsPanel';
import FormCanvas from './components/FormCanvas';
import FormPreview from './components/FormPreview';
import FormList from './components/FormList';
import FormBuilderErrorBoundary from './components/FormBuilderErrorBoundary';
import CommandPalette from './components/CommandPalette';
import FormOutline from './components/FormOutline';
import DeveloperPackDialog from './components/DeveloperPackDialog';
import EntityRecordsDialog from './components/EntityRecordsDialog';
import ConvertToEntityDialog from './components/ConvertToEntityDialog';
import { exportFormJson, saveFormAsTemplate } from '../api/formBuilderApi';
import { toast } from 'sonner';
import { useAiChatStore } from './aiChatStore';

// ── Lazy-loaded heavy panels (code-split) ──
const SubmissionsViewer = lazy(() => import('./components/SubmissionsViewer'));
const VersionHistory = lazy(() => import('./components/VersionHistory'));
const FormAnalytics = lazy(() => import('./components/FormAnalytics'));
const EmbedSnippet = lazy(() => import('./components/EmbedSnippet'));
const ResponseInsights = lazy(() => import('./components/ResponseInsights'));
const CollaborationNotes = lazy(() => import('./components/CollaborationNotes'));
const GlobalFieldPicker = lazy(() => import('./components/GlobalFieldPicker'));
const ActionsPanel = lazy(() => import('./components/ActionsPanel'));
const AiChatDrawer = lazy(() => import('./ai').then(m => ({ default: m.AiChatDrawer })));

const PanelSpinner = () => (
  <div className="flex items-center justify-center py-12">
    <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
  </div>
);

export default function FormBuilderPage() {
  const {
    activeForm,
    sidePanel,
    previewMode,
    undoStack,
    redoStack,
    setSidePanel,
    togglePreview,
    saveForm,
    undo,
    redo,
    loadForm,
    loadFromStorage,
    selectField,
  } = useFormBuilderStore();

  const { isOpen: aiChatOpen, toggleChat: toggleAiChat, isDocked: aiChatDocked } = useAiChatStore();

  // Phase 1 multiplayer awareness: who else has this form open?
  const { others: presenceOthers } = usePresence('form', activeForm?.id);

  const [showList, setShowList] = useState(true);
  const [showSubmissions, setShowSubmissions] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showEmbed, setShowEmbed] = useState(false);
  const [showInsights, setShowInsights] = useState(false);

  const [autosaveStatus, setAutosaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [showDeveloperPack, setShowDeveloperPack] = useState(false);
  const [showEntityRecords, setShowEntityRecords] = useState(false);
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSnapshot = useRef<string>('');
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  // Collapse the right sidebar to give the canvas full width
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem('fb_sidebar_collapsed') === '1';
  });
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('fb_sidebar_collapsed', sidebarCollapsed ? '1' : '0');
  }, [sidebarCollapsed]);

  // Track unsaved-changes dirty state for the save indicator
  const isDirty = autosaveStatus === 'saving' || (autosaveStatus === 'idle' && lastSavedAt === null && !!activeForm);

  // Auto-switch to "properties" panel whenever a field is selected
  const selectedFieldId = useFormBuilderStore((s) => s.selectedFieldId);
  useEffect(() => {
    if (selectedFieldId) setSidePanel('properties');
  }, [selectedFieldId, setSidePanel]);

  // Relative-time helper for the save indicator
  const [, setNowTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setNowTick((n) => n + 1), 15_000);
    return () => clearInterval(id);
  }, []);
  const relativeSavedTime = (() => {
    if (!lastSavedAt) return null;
    const ms = Date.now() - lastSavedAt.getTime();
    if (ms < 5_000) return 'just now';
    if (ms < 60_000) return `${Math.floor(ms / 1000)}s ago`;
    if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
    return `${Math.floor(ms / 3_600_000)}h ago`;
  })();
  // Load saved forms on mount
  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  // Show list when no active form
  useEffect(() => {
    if (!activeForm) setShowList(true);
  }, [activeForm]);

  // Autosave: debounced 2s after each change (only in editor, not list/submissions/etc)
  useEffect(() => {
    if (!activeForm || showList || showSubmissions || showVersions || showAnalytics || showEmbed || showInsights || previewMode) return;
    const snap = JSON.stringify(activeForm);
    if (snap === lastSnapshot.current) return;
    lastSnapshot.current = snap;

    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(async () => {
      setAutosaveStatus('saving');
      try {
        await saveForm();
        setLastSavedAt(new Date());
      } catch { /* ignore */ }
      setAutosaveStatus('saved');
      setTimeout(() => setAutosaveStatus('idle'), 2000);
    }, 2000);

    return () => { if (autosaveTimer.current) clearTimeout(autosaveTimer.current); };
  }, [activeForm, showList, showSubmissions, showVersions, showAnalytics, showEmbed, showInsights, previewMode, saveForm]);

  // Close "More" dropdown on outside click
  useEffect(() => {
    if (!showMoreMenu) return;
    const handler = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMoreMenu]);

  // Keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Ignore when typing in inputs/textareas
      const tag = (e.target as HTMLElement)?.tagName;
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (e.target as HTMLElement)?.isContentEditable;

      const isCtrlGlobal = e.ctrlKey || e.metaKey;
      // Global AI chat toggle — works even when no form is loaded.
      if (isCtrlGlobal && (e.key === 'i' || e.key === 'I')) {
        e.preventDefault();
        toggleAiChat();
        return;
      }

      if (!activeForm) return;
      const isCtrl = e.ctrlKey || e.metaKey;

      if (isCtrl && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (isCtrl && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      } else if (isCtrl && e.key === 's') {
        e.preventDefault();
        saveForm();
      } else if (isCtrl && e.key === 'p') {
        e.preventDefault();
        togglePreview();
      } else if (isCtrl && e.key === 'd' && !isInput) {
        // Duplicate selected field
        const { selectedFieldId: fId, selectedSectionId: sId, duplicateField } = useFormBuilderStore.getState();
        if (fId && sId) {
          e.preventDefault();
          duplicateField(sId, fId);
        }
      } else if (e.key === 'Delete' && !isInput) {
        // Delete selected field
        const { selectedFieldId: fId, selectedSectionId: sId, removeField } = useFormBuilderStore.getState();
        if (fId && sId) {
          e.preventDefault();
          removeField(sId, fId);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        selectField(null, null);
        setShowShortcuts(false);
      } else if (e.key === '?' && isCtrl) {
        e.preventDefault();
        setShowShortcuts((s) => !s);
      }
    },
    [activeForm, undo, redo, saveForm, togglePreview, selectField, toggleAiChat],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleEdit = (form: FormDefinition) => {
    loadForm(form);
    setShowList(false);
    setShowSubmissions(false);
    setShowVersions(false);
    setShowAnalytics(false);
    setShowEmbed(false);
    setShowInsights(false);
  };

  // ── Print Blank Form ──
  const handlePrintForm = () => {
    if (!activeForm) return;
    const printWin = window.open('', '_blank', 'width=900,height=700');
    if (!printWin) return;

    const fieldHtml = (label: string, type: string, required: boolean, helpText?: string) => {
      const req = required ? '<span style="color:#ef4444;margin-left:2px">*</span>' : '';
      const help = helpText ? `<p style="font-size:10px;color:#9ca3af;margin:2px 0 0 0">${helpText}</p>` : '';
      let inputEl = '<div style="border:1px solid #d1d5db;border-radius:4px;height:32px;margin-top:4px;background:#fafafa"></div>';
      if (type === 'textarea' || type === 'richtext') {
        inputEl = '<div style="border:1px solid #d1d5db;border-radius:4px;height:64px;margin-top:4px;background:#fafafa"></div>';
      } else if (type === 'checkbox' || type === 'switch') {
        inputEl = `<div style="display:flex;align-items:center;gap:6px;margin-top:4px"><div style="width:16px;height:16px;border:1px solid #d1d5db;border-radius:3px"></div><span style="font-size:12px;color:#374151">${label}</span></div>`;
        return `<div style="margin-bottom:12px">${inputEl}${help}</div>`;
      } else if (type === 'select' || type === 'multi-select') {
        inputEl = '<div style="border:1px solid #d1d5db;border-radius:4px;height:32px;margin-top:4px;background:#fafafa;display:flex;align-items:center;justify-content:flex-end;padding-right:8px;font-size:11px;color:#9ca3af">▾</div>';
      } else if (type === 'rating') {
        inputEl = '<div style="margin-top:4px;font-size:20px;color:#d1d5db">★ ★ ★ ★ ★</div>';
      } else if (type === 'signature') {
        inputEl = '<div style="border:2px dashed #d1d5db;border-radius:4px;height:48px;margin-top:4px;display:flex;align-items:center;justify-content:center;font-size:11px;color:#9ca3af">Signature</div>';
      } else if (type === 'file' || type === 'image') {
        inputEl = '<div style="border:1px dashed #d1d5db;border-radius:4px;height:40px;margin-top:4px;display:flex;align-items:center;justify-content:center;font-size:11px;color:#9ca3af">📎 Upload</div>';
      } else if (type === 'heading') {
        return `<h3 style="font-size:14px;font-weight:700;color:#374151;margin:12px 0 4px 0">${label}</h3>`;
      } else if (type === 'separator') {
        return '<hr style="border:none;border-top:1px solid #e5e7eb;margin:8px 0"/>';
      }
      return `<div style="margin-bottom:12px"><label style="font-size:11px;font-weight:500;color:#374151">${label}${req}</label>${inputEl}${help}</div>`;
    };

    const sectionHtmls = activeForm.sections.map((sec) => {
      const fields = sec.fields
        .filter((f) => !['columns'].includes(f.type))
        .map((f) => fieldHtml(f.label, f.type, !!f.validation?.required, f.helpText))
        .join('');
      return `<div style="margin-bottom:20px"><h2 style="font-size:13px;font-weight:600;color:#374151;border-bottom:1px solid #e5e7eb;padding-bottom:4px;margin-bottom:10px">${sec.title}</h2>${fields}</div>`;
    }).join('');

    printWin.document.write(`<!DOCTYPE html><html><head><title>${activeForm.name} - Print Form</title>
<style>
  body { font-family: system-ui, -apple-system, sans-serif; margin: 40px; color: #1f2937; max-width: 700px; margin: 40px auto; }
  h1 { font-size: 20px; margin-bottom: 4px; }
  p.desc { font-size: 12px; color: #6b7280; margin-bottom: 24px; }
  @media print { body { margin: 20px auto; } }
</style></head><body>
  <h1>${activeForm.name}</h1>
  ${activeForm.description ? `<p class="desc">${activeForm.description}</p>` : ''}
  ${sectionHtmls}
  <div style="margin-top:24px;padding-top:12px;border-top:1px solid #e5e7eb;text-align:right">
    <span style="font-size:11px;color:#9ca3af">Form ID: ${activeForm.slug} &nbsp;|&nbsp; Generated: ${new Date().toLocaleDateString()}</span>
  </div>
</body></html>`);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => printWin.print(), 300);
  };

  const handleBackToList = () => {
    saveForm();
    setShowList(true);
    setShowSubmissions(false);
    setShowVersions(false);
    setShowAnalytics(false);
    setShowEmbed(false);
    setShowInsights(false);
  };

  // ── Form List View ──
  if (showList || !activeForm) {
    return (
      <>
        <PageMeta title="Form Builder | Super Admin" description="No-code form builder" />
        <FormList
          onEdit={handleEdit}
          onViewSubmissions={(form) => {
            loadForm(form);
            setShowList(false);
            setShowSubmissions(true);
            setShowVersions(false);
            setShowAnalytics(false);
            setShowEmbed(false);
            setShowInsights(false);
          }}
        />
      </>
    );
  }

  // ── Submissions View ──
  if (showSubmissions) {
    return (
      <>
        <PageMeta title={`Submissions: ${activeForm.name}`} description="Form submissions" />
        <FormBuilderErrorBoundary panelName="Submissions" onClose={handleBackToList}>
          <Suspense fallback={<PanelSpinner />}>
            <SubmissionsViewer form={activeForm} onClose={handleBackToList} />
          </Suspense>
        </FormBuilderErrorBoundary>
      </>
    );
  }

  // ── Version History View ──
  if (showVersions) {
    return (
      <>
        <PageMeta title={`Versions: ${activeForm.name}`} description="Form version history" />
        <FormBuilderErrorBoundary panelName="Version History" onClose={() => setShowVersions(false)}>
          <Suspense fallback={<PanelSpinner />}>
            <VersionHistory
              form={activeForm}
              onClose={() => { setShowVersions(false); }}
              onRestored={() => {
                setShowVersions(false);
                loadFromStorage();
              }}
            />
          </Suspense>
        </FormBuilderErrorBoundary>
      </>
    );
  }

  // ── Response Insights View ──
  if (showInsights) {
    return (
      <>
        <PageMeta title={`Insights: ${activeForm.name}`} description="Response insights" />
        <FormBuilderErrorBoundary panelName="Response Insights" onClose={() => setShowInsights(false)}>
          <Suspense fallback={<PanelSpinner />}>
            <ResponseInsights form={activeForm} onClose={() => { setShowInsights(false); }} />
          </Suspense>
        </FormBuilderErrorBoundary>
      </>
    );
  }

  // ── Analytics View ──
  if (showAnalytics) {
    return (
      <>
        <PageMeta title={`Analytics: ${activeForm.name}`} description="Form analytics" />
        <FormBuilderErrorBoundary panelName="Analytics" onClose={() => setShowAnalytics(false)}>
          <Suspense fallback={<PanelSpinner />}>
            <FormAnalytics form={activeForm} onClose={() => { setShowAnalytics(false); }} />
          </Suspense>
        </FormBuilderErrorBoundary>
      </>
    );
  }

  // ── Embed View ──
  if (showEmbed) {
    return (
      <>
        <PageMeta title={`Embed: ${activeForm.name}`} description="Form embed code" />
        <FormBuilderErrorBoundary panelName="Embed Snippet" onClose={() => setShowEmbed(false)}>
          <Suspense fallback={<PanelSpinner />}>
            <EmbedSnippet form={activeForm} onClose={() => { setShowEmbed(false); }} />
          </Suspense>
        </FormBuilderErrorBoundary>
      </>
    );
  }

  // ── Preview Mode ──
  if (previewMode) {
    return (
      <>
        <PageMeta title={`Preview: ${activeForm.name}`} description="Form preview" />
        <FormPreview form={activeForm} onClose={togglePreview} />
      </>
    );
  }

  // ── Editor View ──
  return (
    <>
      <PageMeta title={`Edit: ${activeForm.name}`} description="Form builder editor" />

      <div
        className={`flex h-[calc(100vh-140px)] flex-col bg-gray-50 dark:bg-gray-900 transition-[margin] duration-200 ${
          aiChatOpen && aiChatDocked ? 'mr-105' : ''
        }`}
      >
        {/* ── Toolbar — Row 1: identity + state ── */}
        <header
          className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-2.5 dark:border-gray-700 dark:bg-gray-800"
          role="toolbar"
          aria-label="Form editor — title and status"
        >
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={handleBackToList}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
              title="Back to forms"
              aria-label="Back to forms"
            >
              <span aria-hidden="true">←</span>
              <span className="hidden sm:inline">Forms</span>
            </button>
            <span className="text-gray-300 dark:text-gray-600" aria-hidden="true">/</span>
            <h1 className="min-w-0 truncate text-sm font-semibold text-gray-800 dark:text-gray-100" title={activeForm.name}>
              {activeForm.name || 'Untitled Form'}
            </h1>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                activeForm.status === 'published'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : activeForm.status === 'archived'
                    ? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
              }`}
            >
              {activeForm.status}
            </span>
            {activeForm.kind === 'entity' && (
              <span
                className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                title={activeForm.entityTableName ? `DB table: ${activeForm.entityTableName}` : 'Will be provisioned on publish'}
              >
                🗂 entity
              </span>
            )}
            {activeForm.kind === 'entity' && activeForm.bindingMode === 'bound' && activeForm.boundModel && (
              <span
                className="rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-teal-700 dark:bg-teal-900/30 dark:text-teal-400"
                title={`Bound to existing Prisma model · table: ${activeForm.boundTableName ?? '?'}`}
              >
                🔗 bound to {activeForm.boundModel}
              </span>
            )}
            {/* Multiplayer presence — other people currently editing this form. */}
            {presenceOthers.length > 0 && (
              <div className="ml-1">
                <PresenceAvatars members={presenceOthers} />
              </div>
            )}
            {isDirty && (
              <span
                className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-amber-500"
                title="Unsaved changes"
                aria-label="Unsaved changes"
              />
            )}
          </div>

          {/* Save state */}
          <div className="flex items-center gap-3 text-xs">
            {autosaveStatus === 'saving' ? (
              <span className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-blue-500" />
                Saving…
              </span>
            ) : autosaveStatus === 'saved' ? (
              <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                <span aria-hidden="true">✓</span> Saved
              </span>
            ) : lastSavedAt ? (
              <span className="text-gray-400 dark:text-gray-500">Saved {relativeSavedTime}</span>
            ) : (
              <span className="text-gray-400 dark:text-gray-500">Autosave on</span>
            )}
            <button
              type="button"
              onClick={() => { saveForm(); setLastSavedAt(new Date()); setAutosaveStatus('saved'); setTimeout(() => setAutosaveStatus('idle'), 1500); }}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700"
              title="Save (Ctrl+S)"
            >
              Save
            </button>
          </div>
        </header>

        {/* ── Toolbar — Row 2: action bar ── */}
        <div
          className="flex items-center gap-1 border-b border-gray-200 bg-white px-3 py-1.5 dark:border-gray-700 dark:bg-gray-800"
          role="toolbar"
          aria-label="Form editor actions"
        >
          {/* Undo / Redo group */}
          <div className="flex items-center rounded-md border border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={undo}
              disabled={undoStack.length === 0}
              className="rounded-l-md px-2 py-1 text-sm text-gray-500 hover:bg-gray-50 disabled:opacity-30 dark:text-gray-400 dark:hover:bg-gray-700"
              title={`Undo (Ctrl+Z) · ${undoStack.length} step${undoStack.length === 1 ? '' : 's'}`}
              aria-label="Undo"
            >
              ↩
            </button>
            <div className="h-5 w-px bg-gray-200 dark:bg-gray-700" aria-hidden="true" />
            <button
              type="button"
              onClick={redo}
              disabled={redoStack.length === 0}
              className="rounded-r-md px-2 py-1 text-sm text-gray-500 hover:bg-gray-50 disabled:opacity-30 dark:text-gray-400 dark:hover:bg-gray-700"
              title="Redo (Ctrl+Y)"
              aria-label="Redo"
            >
              ↪
            </button>
          </div>

          <div className="mx-1 h-4 w-px bg-gray-200 dark:bg-gray-700" aria-hidden="true" />

          {/* Primary actions */}
          <button
            type="button"
            onClick={togglePreview}
            className="rounded-md px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-purple-50 hover:text-purple-700 dark:text-gray-300 dark:hover:bg-purple-900/20 dark:hover:text-purple-400"
            title="Preview (Ctrl+P)"
          >
            <span aria-hidden="true">👁</span> Preview
          </button>
          <button
            type="button"
            onClick={() => setShowSubmissions(true)}
            className="rounded-md px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 dark:text-gray-300 dark:hover:bg-indigo-900/20 dark:hover:text-indigo-400"
          >
            <span aria-hidden="true">📊</span> Submissions
          </button>
          <button
            type="button"
            onClick={() => setShowVersions(true)}
            className="rounded-md px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
            title="Version history"
          >
            <span aria-hidden="true">🕘</span> Versions
          </button>

          <div className="ml-auto flex items-center gap-1">
            {/* AI Assistant */}
            <button
              type="button"
              onClick={toggleAiChat}
              className={`group flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                aiChatOpen
                  ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-sm'
                  : 'bg-gradient-to-r from-violet-50 to-fuchsia-50 text-violet-700 hover:from-violet-100 hover:to-fuchsia-100 dark:from-violet-900/20 dark:to-fuchsia-900/20 dark:text-violet-300'
              }`}
              title="AI Form Assistant"
            >
              <span aria-hidden="true" className="transition group-hover:rotate-12">✨</span>
              AI Assistant
            </button>

            {/* More dropdown */}
            <div className="relative" ref={moreMenuRef}>
              <button
                type="button"
                onClick={() => setShowMoreMenu((s) => !s)}
                className="rounded-md px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                aria-haspopup="menu"
                aria-expanded={showMoreMenu}
                title="More actions"
              >
                ⋯
              </button>
              {showMoreMenu && (
                <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-xl dark:border-gray-700 dark:bg-gray-800">
                  <button
                    type="button"
                    onClick={() => { setShowInsights(true); setShowMoreMenu(false); }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    🔍 Response Insights
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowAnalytics(true); setShowMoreMenu(false); }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    📈 Analytics
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowVersions(true); setShowMoreMenu(false); }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    🕘 Version History
                  </button>
                  <button
                    type="button"
                    onClick={() => { exportFormJson(activeForm.id).catch(() => {}); setShowMoreMenu(false); }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    ⬇ Export JSON
                  </button>
                  {activeForm.status === 'published' && (
                    <>
                      <button
                        type="button"
                        onClick={() => { setShowEmbed(true); setShowMoreMenu(false); }}
                        className="flex w-full items-center gap-2 px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
                      >
                        🧩 Embed Code
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const url = `${window.location.origin}/forms/${activeForm.slug}`;
                          navigator.clipboard.writeText(url).then(() => toast.success('Link copied!')).catch(() => {});
                          setShowMoreMenu(false);
                        }}
                        className="flex w-full items-center gap-2 px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
                      >
                        🔗 Copy Public Link
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={async () => {
                      setShowMoreMenu(false);
                      if (!activeForm) return;
                      try {
                        await saveFormAsTemplate(activeForm);
                        toast.success('Form saved as template!');
                      } catch { toast.error('Failed to save template'); }
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    📋 Save as Template
                  </button>
                  <div className="my-1 border-t border-gray-100 dark:border-gray-700" />
                  {activeForm.kind === 'entity' && activeForm.status === 'published' && (
                    <button
                      type="button"
                      onClick={() => { setShowEntityRecords(true); setShowMoreMenu(false); }}
                      className="flex w-full items-center gap-2 px-4 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/20"
                    >
                      🗂️ Entity Records
                      <span className="ml-auto rounded bg-emerald-100 px-1 py-0 text-[8px] uppercase tracking-wider text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">live</span>
                    </button>
                  )}
                  {/* Convert process → entity (only for process kind) */}
                  {(activeForm.kind === 'process' || !activeForm.kind) && (
                    <button
                      type="button"
                      onClick={() => { setShowConvertDialog(true); setShowMoreMenu(false); }}
                      className="flex w-full items-center gap-2 px-4 py-2 text-xs font-medium text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-900/20"
                    >
                      🚀 Convert to Master
                      <span className="ml-auto rounded bg-amber-100 px-1 py-0 text-[8px] uppercase tracking-wider text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">new</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => { setShowDeveloperPack(true); setShowMoreMenu(false); }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-xs font-medium text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                  >
                    ⚙️ Developer Pack
                    <span className="ml-auto rounded bg-blue-100 px-1 py-0 text-[8px] uppercase tracking-wider text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">new</span>
                  </button>
                  <div className="my-1 border-t border-gray-100 dark:border-gray-700" />
                  <button
                    type="button"
                    onClick={() => { handlePrintForm(); setShowMoreMenu(false); }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    🖨️ Print Blank Form
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowShortcuts(true); setShowMoreMenu(false); }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    ⌨️ Keyboard Shortcuts
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Editor Body: Outline + Canvas + Right sidebar ── */}
        <div className="relative flex flex-1 overflow-hidden">
          {/* Outline */}
          <FormOutline />

          {/* Canvas */}
          <main className="flex-1 overflow-y-auto" aria-label="Form canvas">
            <FormCanvas />
          </main>

          {/* Right Sidebar */}
          <aside
            className={`shrink-0 border-l border-gray-200 bg-white transition-[width] duration-200 dark:border-gray-700 dark:bg-gray-800 ${
              sidebarCollapsed ? 'w-10' : 'w-80'
            }`}
            role="complementary"
            aria-label="Form editor sidebar"
          >
            {/* Collapse toggle */}
            <button
              type="button"
              onClick={() => setSidebarCollapsed((c) => !c)}
              className="absolute left-[-12px] top-2 z-10 hidden h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-white text-xs text-gray-500 shadow-sm hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? '◀' : '▶'}
            </button>

            {sidebarCollapsed ? (
              <div className="flex flex-col items-center gap-2 py-3">
                {(['palette', 'properties', 'settings', 'globalFields', 'notes'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => { setSidePanel(tab); setSidebarCollapsed(false); }}
                    className="flex h-8 w-8 items-center justify-center rounded-md text-base text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                    title={tab === 'palette' ? 'Fields' : tab === 'globalFields' ? 'Global fields' : tab === 'properties' ? 'Properties' : tab === 'settings' ? 'Form settings' : 'Notes'}
                  >
                    {tab === 'palette' ? '🧩' : tab === 'globalFields' ? '🌐' : tab === 'properties' ? '🔧' : tab === 'settings' ? '⚙️' : '📝'}
                  </button>
                ))}
                <div className="my-1 h-px w-6 bg-gray-200 dark:bg-gray-700" />
                <button
                  type="button"
                  onClick={() => setSidebarCollapsed(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-base text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                  title="Expand sidebar"
                  aria-label="Expand sidebar"
                >
                  ▶
                </button>
              </div>
            ) : (
              <div className="flex h-full flex-col">
                {/* Sidebar tabs */}
                <div
                  className="flex items-center justify-between gap-1 border-b border-gray-200 px-2 py-1.5 dark:border-gray-700"
                  role="tablist"
                  aria-label="Sidebar panels"
                >
                  <div className="flex flex-1 gap-0.5 overflow-x-auto">
                    {(['palette', 'properties', 'settings', 'actions', 'globalFields', 'notes'] as const).map((tab) => {
                      const labels = {
                        palette: { icon: '🧩', label: 'Fields' },
                        globalFields: { icon: '🌐', label: 'Global' },
                        properties: { icon: '🔧', label: 'Properties' },
                        settings: { icon: '⚙', label: 'Settings' },
                        actions: { icon: '⚡', label: 'Actions' },
                        notes: { icon: '📝', label: 'Notes' },
                      } as const;
                      const meta = labels[tab];
                      const active = sidePanel === tab;
                      return (
                        <button
                          key={tab}
                          type="button"
                          role="tab"
                          aria-selected={active}
                          onClick={() => setSidePanel(tab)}
                          className={`flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition ${
                            active
                              ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:ring-blue-900/40'
                              : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200'
                          }`}
                        >
                          <span aria-hidden="true">{meta.icon}</span>
                          <span className="hidden md:inline">{meta.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={() => setSidebarCollapsed(true)}
                    className="ml-1 shrink-0 rounded-md px-1.5 py-1 text-xs text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                    title="Collapse sidebar"
                    aria-label="Collapse sidebar"
                  >
                    ▶
                  </button>
                </div>

                {/* Sidebar content */}
                <div className="flex-1 overflow-y-auto p-3">
                  {sidePanel === 'palette' && <FieldPalette />}
                  {sidePanel === 'globalFields' && <Suspense fallback={<PanelSpinner />}><GlobalFieldPicker /></Suspense>}
                  {sidePanel === 'properties' && <FieldProperties />}
                  {sidePanel === 'settings' && <FormSettingsPanel />}
                  {sidePanel === 'actions' && <Suspense fallback={<PanelSpinner />}><ActionsPanel /></Suspense>}
                  {sidePanel === 'notes' && <Suspense fallback={<PanelSpinner />}><CollaborationNotes formId={activeForm?.id || ''} /></Suspense>}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>

      {/* AI Chat Drawer */}
      <Suspense fallback={null}>
        <AiChatDrawer />
      </Suspense>

      {/* Command Palette (Ctrl+K) */}
      <CommandPalette />

      {/* Developer Pack — Prisma / SQL / Types / OpenAPI / Sample queries */}
      {activeForm && (
        <DeveloperPackDialog
          formId={activeForm.id}
          formName={activeForm.name}
          open={showDeveloperPack}
          onClose={() => setShowDeveloperPack(false)}
        />
      )}

      {/* Entity Records — for kind='entity' published forms */}
      {activeForm && activeForm.kind === 'entity' && (
        <EntityRecordsDialog
          slug={activeForm.slug}
          formName={activeForm.name}
          open={showEntityRecords}
          onClose={() => setShowEntityRecords(false)}
        />
      )}

      {/* Convert process → entity (Phase 4.2) */}
      {activeForm && (activeForm.kind === 'process' || !activeForm.kind) && (
        <ConvertToEntityDialog
          formId={activeForm.id}
          formName={activeForm.name}
          open={showConvertDialog}
          onClose={() => setShowConvertDialog(false)}
          onConverted={() => loadFromStorage()}
        />
      )}

      {/* Keyboard Shortcuts Overlay */}
      {showShortcuts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-modal="true" aria-label="Keyboard shortcuts" onClick={() => setShowShortcuts(false)}>
          <div
            className="w-105 rounded-xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-700 dark:bg-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white">⌨️ Keyboard Shortcuts</h3>
              <button
                type="button"
                onClick={() => setShowShortcuts(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                aria-label="Close shortcuts dialog"
              >✕</button>
            </div>
            <div className="space-y-2 text-sm">
              {[
                ['Ctrl + Z', 'Undo'],
                ['Ctrl + Y', 'Redo'],
                ['Ctrl + S', 'Save form'],
                ['Ctrl + P', 'Toggle preview'],
                ['Ctrl + I', 'Toggle AI assistant'],
                ['Ctrl + D', 'Duplicate selected field'],
                ['Delete', 'Remove selected field'],
                ['Escape', 'Deselect / close overlays'],
                ['Ctrl + ?', 'Show this help'],
              ].map(([key, desc]) => (
                <div key={key} className="flex items-center justify-between py-1">
                  <span className="text-gray-600 dark:text-gray-300">{desc}</span>
                  <kbd className="rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs font-mono text-gray-700 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300">
                    {key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
