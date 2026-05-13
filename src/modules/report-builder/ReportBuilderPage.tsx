/**
 * ReportBuilderPage — Three-panel orchestrator.
 *
 * Layout: [DataSourcePanel] [Toolbar + ReportCanvas] [PropertiesPanel]
 */

import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { useReportBuilderStore } from './store';
import { DataSourcePanel } from './components/DataSourcePanel';
import { ReportCanvas } from './components/ReportCanvas';
import { PropertiesPanel } from './components/PropertiesPanel';
import { VisualizationPicker } from './components/VisualizationPicker';
import { AiAssistantDrawer } from './components/AiAssistantDrawer';
import { useAiReportChatStore } from './aiReportChatStore';
import { usePresence } from '../presence/usePresence';
import { PresenceAvatars } from '../presence/PresenceAvatars';
import { VersionHistoryDrawer } from './components/VersionHistoryDrawer';
import { SubscriptionsDrawer } from './components/SubscriptionsDrawer';
import { SharesDrawer } from './components/SharesDrawer';
import { SavedViewsMenu } from './components/SavedViewsMenu';
import { downloadReport } from './api/reportBuilderApi';

export default function ReportBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const activeReport = useReportBuilderStore((s) => s.activeReport);
  const dirty = useReportBuilderStore((s) => s.dirty);
  const saving = useReportBuilderStore((s) => s.saving);
  const lastSavedAt = useReportBuilderStore((s) => s.lastSavedAt);
  const undoStack = useReportBuilderStore((s) => s.undoStack);
  const redoStack = useReportBuilderStore((s) => s.redoStack);

  const loadReport = useReportBuilderStore((s) => s.loadReport);
  const newReport = useReportBuilderStore((s) => s.newReport);
  const closeReport = useReportBuilderStore((s) => s.closeReport);
  const saveReport = useReportBuilderStore((s) => s.saveReport);
  const publishActiveReport = useReportBuilderStore((s) => s.publishActiveReport);
  const undo = useReportBuilderStore((s) => s.undo);
  const redo = useReportBuilderStore((s) => s.redo);

  const [aiOpen, setAiOpen] = useState(false);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [subsOpen, setSubsOpen] = useState(false);
  const [sharesOpen, setSharesOpen] = useState(false);
  const aiDocked = useAiReportChatStore((s) => s.isDocked);

  // Phase 1 multiplayer awareness: who else is editing this report?
  const { others: presenceOthers } = usePresence('report', activeReport?.id);

  useEffect(() => {
    if (id === 'new') {
      const typeParam = searchParams.get('type');
      const type = (typeParam === 'analytical' || typeParam === 'dashboard' || typeParam === 'banded')
        ? typeParam
        : 'operational';
      void newReport(undefined, type);
    } else if (id) {
      void loadReport(id).catch((err) => {
        toast.error(err instanceof Error ? err.message : 'Failed to load report');
        navigate('/reports/builder');
      });
    }
    return () => closeReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isMod = e.ctrlKey || e.metaKey;
      if (isMod && e.key === 's') {
        e.preventDefault();
        void handleSave();
      } else if (isMod && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undo();
      } else if (isMod && (e.shiftKey && e.key.toLowerCase() === 'z' || e.key.toLowerCase() === 'y')) {
        e.preventDefault();
        redo();
      } else if (isMod && e.key.toLowerCase() === 'j') {
        // Toggle the AI assistant (J = "join the conversation").
        e.preventDefault();
        setAiOpen((o) => !o);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSave() {
    if (!activeReport) return;
    try {
      const wasNew = !activeReport.id;
      await saveReport();
      const next = useReportBuilderStore.getState().activeReport;
      toast.success(wasNew ? 'Report created' : 'Saved');
      if (wasNew && next?.id && next.id !== id) {
        navigate(`/reports/builder/${next.id}`, { replace: true });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    }
  }

  async function handlePublish() {
    if (!activeReport) return;
    if (!activeReport.id) {
      toast.error('Save the report first');
      return;
    }
    try {
      await publishActiveReport();
      toast.success('Report published');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Publish failed');
    }
  }

  async function handleExport(format: 'xlsx' | 'csv' | 'pdf') {
    if (!activeReport?.id) {
      toast.error('Save the report first');
      return;
    }
    try {
      await downloadReport(activeReport.id, activeReport.name, format);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Export failed');
    }
  }

  if (!activeReport) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-gray-500">
        Loading report…
      </div>
    );
  }

  return (
    <div
      className={`flex h-[calc(100vh-4rem)] flex-col transition-[margin] duration-200 ${
        aiOpen && aiDocked ? 'mr-105' : ''
      }`}
    >
      {/* Toolbar */}
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 bg-white px-4 py-2 dark:border-gray-700 dark:bg-gray-900">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/reports/builder')}
            className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          >
            ← Reports
          </button>
          <h1 className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
            {activeReport.name}
            <span className={`ml-2 inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
              activeReport.status === 'published'
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                : 'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
            }`}>
              {activeReport.status}
            </span>
          </h1>
          <SaveStatus dirty={dirty} saving={saving} lastSavedAt={lastSavedAt} />
          {presenceOthers.length > 0 && (
            <PresenceAvatars members={presenceOthers} />
          )}
        </div>

        {activeReport.type !== 'dashboard' && <VisualizationPicker />}

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setAiOpen(true)}
            title="AI Assistant — describe a report in natural language (Ctrl+J)"
            className="rounded bg-linear-to-br from-purple-600 to-blue-600 px-2.5 py-1 text-xs font-medium text-white shadow-sm hover:from-purple-700 hover:to-blue-700"
          >
            ✨ AI
          </button>
          <ToolbarBtn
            onClick={() => setVersionsOpen(true)}
            disabled={!activeReport.id}
            title="Version history"
          >
            ⟳
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => setSubsOpen(true)}
            disabled={!activeReport.id}
            title="Email subscriptions"
          >
            📧
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => setSharesOpen(true)}
            disabled={!activeReport.id}
            title="Share via public link"
          >
            🔗
          </ToolbarBtn>
          {activeReport.id && activeReport.type !== 'dashboard' && (
            <SavedViewsMenu reportId={activeReport.id} />
          )}
          <div className="mx-1 h-6 w-px bg-gray-200 dark:bg-gray-700" />
          <ToolbarBtn onClick={undo} disabled={undoStack.length === 0} title="Undo (Ctrl+Z)">
            ↶
          </ToolbarBtn>
          <ToolbarBtn onClick={redo} disabled={redoStack.length === 0} title="Redo (Ctrl+Shift+Z)">
            ↷
          </ToolbarBtn>
          <div className="mx-1 h-6 w-px bg-gray-200 dark:bg-gray-700" />
          <ToolbarBtn onClick={() => handleExport('csv')} disabled={!activeReport.id} title="Export CSV">
            CSV
          </ToolbarBtn>
          <ToolbarBtn onClick={() => handleExport('xlsx')} disabled={!activeReport.id} title="Export Excel">
            XLSX
          </ToolbarBtn>
          <ToolbarBtn onClick={() => handleExport('pdf')} disabled={!activeReport.id} title="Export PDF (printable)">
            PDF
          </ToolbarBtn>
          <div className="mx-1 h-6 w-px bg-gray-200 dark:bg-gray-700" />
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded bg-gray-200 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-300 disabled:opacity-50 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            onClick={handlePublish}
            disabled={saving || !activeReport.id}
            className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Publish
          </button>
        </div>
      </header>

      {/* Body: 3 panels (dashboards skip the side panels — widgets manage their own data) */}
      <div className="flex flex-1 overflow-hidden">
        {activeReport.type !== 'dashboard' && <DataSourcePanel />}
        <ReportCanvas />
        {activeReport.type !== 'dashboard' && <PropertiesPanel />}
      </div>

      {/* Drawers */}
      <AiAssistantDrawer open={aiOpen} onClose={() => setAiOpen(false)} />
      <VersionHistoryDrawer open={versionsOpen} onClose={() => setVersionsOpen(false)} />
      {activeReport.id && (
        <SubscriptionsDrawer
          reportId={activeReport.id}
          open={subsOpen}
          onClose={() => setSubsOpen(false)}
        />
      )}
      {activeReport.id && (
        <SharesDrawer
          reportId={activeReport.id}
          reportName={activeReport.name}
          open={sharesOpen}
          onClose={() => setSharesOpen(false)}
        />
      )}
    </div>
  );
}

function ToolbarBtn({
  children, onClick, disabled, title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="rounded px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-40 dark:text-gray-300 dark:hover:bg-gray-800"
    >
      {children}
    </button>
  );
}

function SaveStatus({
  dirty, saving, lastSavedAt,
}: { dirty: boolean; saving: boolean; lastSavedAt: number | null }) {
  if (saving) return <span className="text-xs text-gray-500">Saving…</span>;
  if (dirty) return <span className="text-xs text-amber-600">Unsaved changes</span>;
  if (lastSavedAt) {
    const sec = Math.floor((Date.now() - lastSavedAt) / 1000);
    return (
      <span className="text-xs text-gray-500">
        Saved {sec < 5 ? 'just now' : `${sec}s ago`}
      </span>
    );
  }
  return null;
}
