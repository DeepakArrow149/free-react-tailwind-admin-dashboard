/**
 * AI Settings Page – Super Admin only
 *
 * Manage AI provider configurations, usage limits, and view usage analytics
 * for the AI-powered form builder assistant.
 */

import { useEffect, useState, useCallback } from 'react';
import { PageMeta } from '@/components/common';
import { toast } from 'sonner';
import {
  fetchProviders,
  createProviderApi,
  updateProviderApi,
  deleteProviderApi,
  fetchDefaultLimits,
  updateDefaultLimitsApi,
  fetchCompanyLimits,
  setCompanyLimitApi,
  fetchUsageStats,
} from '../api/aiApi';

/* ───── Types ───── */
interface ProviderConfig {
  id: number;
  provider: string;
  model: string;
  isActive: boolean;
  temperature: number;
  maxTokens: number;
  createdAt: string;
  updatedAt: string;
}

interface DefaultLimit {
  id: number;
  maxRequestsPerDay: number;
  maxTokensPerRequest: number;
}

interface CompanyLimit {
  id: number;
  companyId: number;
  companyName?: string;
  maxRequestsPerDay: number;
  maxTokensPerRequest: number;
}

interface UsageStats {
  totalRequests: number;
  totalTokensUsed: number;
  avgResponseTime: number;
  topCompanies: { companyId: number; companyName?: string; count: number }[];
  dailyUsage: { date: string; count: number; tokens: number }[];
}

/* ───── Sub-Components ───── */

function ProviderCard({
  provider,
  onEdit,
  onDelete,
  onToggle,
}: {
  provider: ProviderConfig;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}) {
  return (
    <div className={`rounded-xl border p-5 transition-all ${
      provider.isActive
        ? 'border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20'
        : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{provider.provider === 'openai' ? '🟢' : '🟠'}</span>
          <div>
            <h4 className="font-semibold text-gray-800 dark:text-white capitalize">{provider.provider}</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">{provider.model}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onToggle}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            provider.isActive ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
          }`}
          title={provider.isActive ? 'Active – click to deactivate' : 'Inactive – click to activate'}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              provider.isActive ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 dark:text-gray-400 mb-3">
        <span>Temperature: {provider.temperature}</span>
        <span>Max Tokens: {provider.maxTokens}</span>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onEdit}
          className="flex-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-400"
        >
          ✏️ Edit
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400"
        >
          🗑️
        </button>
      </div>
    </div>
  );
}

function ProviderForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<ProviderConfig>;
  onSave: (data: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}) {
  const [provider, setProvider] = useState(initial?.provider || 'openai');
  const [model, setModel] = useState(initial?.model || '');
  const [apiKey, setApiKey] = useState('');
  const [temperature, setTemperature] = useState(initial?.temperature ?? 0.7);
  const [maxTokens, setMaxTokens] = useState(initial?.maxTokens ?? 4096);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!model.trim()) { toast.error('Model name is required'); return; }
    if (!initial && !apiKey.trim()) { toast.error('API key is required for new providers'); return; }

    setSaving(true);
    try {
      await onSave({
        provider,
        model: model.trim(),
        ...(apiKey ? { apiKey } : {}),
        temperature,
        maxTokens,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-blue-200 bg-blue-50/30 p-5 dark:border-blue-800 dark:bg-blue-950/10">
      <h4 className="font-semibold mb-4 text-gray-800 dark:text-white">
        {initial ? 'Edit Provider' : 'Add Provider'}
      </h4>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Provider</label>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="openai">OpenAI</option>
            <option value="anthropic">Anthropic</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Model</label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="">Select a model…</option>
            {provider === 'openai' ? (
              <>
                <option value="gpt-4o">GPT-4o</option>
                <option value="gpt-4o-mini">GPT-4o Mini</option>
                <option value="gpt-4-turbo">GPT-4 Turbo</option>
                <option value="gpt-4">GPT-4</option>
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                <option value="o3-mini">o3 Mini</option>
              </>
            ) : (
              <>
                <option value="claude-sonnet-4-20250514">Claude Sonnet 4</option>
                <option value="claude-opus-4-20250514">Claude Opus 4</option>
                <option value="claude-3-7-sonnet-latest">Claude 3.7 Sonnet</option>
                <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</option>
                <option value="claude-3-5-haiku-20241022">Claude 3.5 Haiku</option>
                <option value="claude-3-haiku-20240307">Claude 3 Haiku</option>
                <option value="claude-3-opus-20240229">Claude 3 Opus</option>
              </>
            )}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            API Key {initial && <span className="text-gray-400">(leave blank to keep current)</span>}
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-..."
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Temperature</label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="2"
              value={temperature}
              onChange={(e) => setTemperature(Number(e.target.value))}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Max Tokens</label>
            <input
              type="number"
              step="256"
              min="256"
              max="32768"
              value={maxTokens}
              onChange={(e) => setMaxTokens(Number(e.target.value))}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700">
          Cancel
        </button>
        <button type="submit" disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
          {saving ? 'Saving...' : initial ? 'Update' : 'Create'}
        </button>
      </div>
    </form>
  );
}

/* ───── Main Page ───── */

export default function AiSettingsPage() {
  const [tab, setTab] = useState<'providers' | 'limits' | 'usage'>('providers');
  const [providers, setProviders] = useState<ProviderConfig[]>([]);
  const [defaults, setDefaults] = useState<DefaultLimit | null>(null);
  const [companyLimits, setCompanyLimits] = useState<CompanyLimit[]>([]);
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingProvider, setEditingProvider] = useState<ProviderConfig | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Company limit form
  const [clCompanyId, setClCompanyId] = useState('');
  const [clMaxReq, setClMaxReq] = useState(100);
  const [clMaxTok, setClMaxTok] = useState(4096);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [p, d, cl, u] = await Promise.all([
        fetchProviders().catch(() => []),
        fetchDefaultLimits().catch(() => null),
        fetchCompanyLimits().catch(() => []),
        fetchUsageStats().catch(() => null),
      ]);
      setProviders(p as ProviderConfig[]);
      setDefaults(d as DefaultLimit | null);
      setCompanyLimits(cl as CompanyLimit[]);
      setUsage(u as UsageStats | null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  /* ── Provider actions ── */
  const handleCreateProvider = async (data: Record<string, unknown>) => {
    await createProviderApi(data as never);
    toast.success('Provider created');
    setShowAddForm(false);
    loadData();
  };

  const handleUpdateProvider = async (data: Record<string, unknown>) => {
    if (!editingProvider) return;
    await updateProviderApi(editingProvider.id, data as never);
    toast.success('Provider updated');
    setEditingProvider(null);
    loadData();
  };

  const handleDeleteProvider = async (id: number) => {
    if (!confirm('Delete this provider?')) return;
    await deleteProviderApi(id);
    toast.success('Provider deleted');
    loadData();
  };

  const handleToggleProvider = async (p: ProviderConfig) => {
    await updateProviderApi(p.id, { isActive: !p.isActive } as never);
    toast.success(p.isActive ? 'Provider deactivated' : 'Provider activated');
    loadData();
  };

  /* ── Default limits ── */
  const handleUpdateDefaults = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!defaults) return;
    await updateDefaultLimitsApi({
      maxRequestsPerDay: defaults.maxRequestsPerDay,
      maxTokensPerRequest: defaults.maxTokensPerRequest,
    } as never);
    toast.success('Default limits updated');
    loadData();
  };

  /* ── Company limit ── */
  const handleSetCompanyLimit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clCompanyId) { toast.error('Company ID required'); return; }
    await setCompanyLimitApi({
      companyId: Number(clCompanyId),
      maxRequestsPerDay: clMaxReq,
      maxTokensPerRequest: clMaxTok,
    } as never);
    toast.success('Company limit saved');
    setClCompanyId('');
    loadData();
  };

  const tabs = [
    { key: 'providers' as const, label: '🔌 Providers', count: providers.length },
    { key: 'limits' as const, label: '⚙️ Limits', count: companyLimits.length },
    { key: 'usage' as const, label: '📊 Usage', count: null },
  ];

  return (
    <>
      <PageMeta title="AI Settings" description="Manage AI providers, limits, and usage" />

      <div className="mx-auto max-w-5xl p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            🤖 AI Form Assistant Settings
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Configure AI providers, set usage limits, and monitor AI usage across your platform.
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-1 rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition ${
                tab === t.key
                  ? 'bg-white text-gray-800 shadow-sm dark:bg-gray-700 dark:text-white'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              {t.label}
              {t.count !== null && (
                <span className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-gray-200 text-xs dark:bg-gray-600">
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <span className="animate-spin text-2xl mr-2">⚙️</span>
            <span className="text-gray-500">Loading settings...</span>
          </div>
        ) : (
          <>
            {/* ─── Providers Tab ─── */}
            {tab === 'providers' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">AI Providers</h3>
                  {!showAddForm && !editingProvider && (
                    <button
                      type="button"
                      onClick={() => setShowAddForm(true)}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    >
                      + Add Provider
                    </button>
                  )}
                </div>

                {showAddForm && (
                  <ProviderForm onSave={handleCreateProvider} onCancel={() => setShowAddForm(false)} />
                )}

                {editingProvider && (
                  <ProviderForm
                    initial={editingProvider}
                    onSave={handleUpdateProvider}
                    onCancel={() => setEditingProvider(null)}
                  />
                )}

                {providers.length === 0 && !showAddForm ? (
                  <div className="rounded-xl border-2 border-dashed border-gray-200 p-10 text-center dark:border-gray-700">
                    <p className="text-lg mb-2">🔌</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      No AI providers configured yet. Add an OpenAI or Anthropic provider to enable the AI assistant.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {providers.map((p) => (
                      <ProviderCard
                        key={p.id}
                        provider={p}
                        onEdit={() => { setEditingProvider(p); setShowAddForm(false); }}
                        onDelete={() => handleDeleteProvider(p.id)}
                        onToggle={() => handleToggleProvider(p)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ─── Limits Tab ─── */}
            {tab === 'limits' && (
              <div className="space-y-6">
                {/* Global defaults */}
                <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                  <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">🌍 Global Default Limits</h3>
                  <form onSubmit={handleUpdateDefaults} className="flex items-end gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Max Requests / Day</label>
                      <input
                        type="number"
                        min={1}
                        value={defaults?.maxRequestsPerDay ?? 50}
                        onChange={(e) => setDefaults((d) => d ? { ...d, maxRequestsPerDay: Number(e.target.value) } : d)}
                        className="w-32 rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Max Tokens / Request</label>
                      <input
                        type="number"
                        min={256}
                        step={256}
                        value={defaults?.maxTokensPerRequest ?? 4096}
                        onChange={(e) => setDefaults((d) => d ? { ...d, maxTokensPerRequest: Number(e.target.value) } : d)}
                        className="w-32 rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                      Save
                    </button>
                  </form>
                </div>

                {/* Company overrides */}
                <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                  <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">🏢 Company-Specific Limits</h3>

                  <form onSubmit={handleSetCompanyLimit} className="flex items-end gap-3 mb-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Company ID</label>
                      <input
                        type="number"
                        value={clCompanyId}
                        onChange={(e) => setClCompanyId(e.target.value)}
                        placeholder="e.g. 1"
                        className="w-28 rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Requests/Day</label>
                      <input
                        type="number"
                        min={1}
                        value={clMaxReq}
                        onChange={(e) => setClMaxReq(Number(e.target.value))}
                        className="w-28 rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Tokens/Req</label>
                      <input
                        type="number"
                        min={256}
                        step={256}
                        value={clMaxTok}
                        onChange={(e) => setClMaxTok(Number(e.target.value))}
                        className="w-28 rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    <button type="submit" className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">
                      Set Limit
                    </button>
                  </form>

                  {companyLimits.length === 0 ? (
                    <p className="text-sm text-gray-400 italic">No company-specific overrides. All companies use global defaults.</p>
                  ) : (
                    <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                          <tr>
                            <th className="px-4 py-2 text-left font-medium text-gray-600 dark:text-gray-300">Company</th>
                            <th className="px-4 py-2 text-left font-medium text-gray-600 dark:text-gray-300">Requests/Day</th>
                            <th className="px-4 py-2 text-left font-medium text-gray-600 dark:text-gray-300">Tokens/Req</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                          {companyLimits.map((cl) => (
                            <tr key={cl.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                              <td className="px-4 py-2 text-gray-700 dark:text-gray-300">{cl.companyName || `Company #${cl.companyId}`}</td>
                              <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{cl.maxRequestsPerDay}</td>
                              <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{cl.maxTokensPerRequest}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ─── Usage Tab ─── */}
            {tab === 'usage' && (
              <div className="space-y-6">
                {/* Summary cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Requests</p>
                    <p className="mt-1 text-2xl font-bold text-gray-800 dark:text-white">
                      {usage?.totalRequests?.toLocaleString() ?? '—'}
                    </p>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Tokens Used</p>
                    <p className="mt-1 text-2xl font-bold text-gray-800 dark:text-white">
                      {usage?.totalTokensUsed?.toLocaleString() ?? '—'}
                    </p>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Avg Response Time</p>
                    <p className="mt-1 text-2xl font-bold text-gray-800 dark:text-white">
                      {usage?.avgResponseTime ? `${Math.round(usage.avgResponseTime)}ms` : '—'}
                    </p>
                  </div>
                </div>

                {/* Daily usage chart (simple bar representation) */}
                {usage?.dailyUsage && usage.dailyUsage.length > 0 && (
                  <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                    <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">📅 Daily Usage (last 30 days)</h3>
                    <div className="flex items-end gap-1 h-40">
                      {(() => {
                        const max = Math.max(...usage.dailyUsage.map((d) => d.count), 1);
                        return usage.dailyUsage.map((d) => (
                          <div
                            key={d.date}
                            className="flex-1 bg-blue-500 rounded-t hover:bg-blue-600 transition-colors relative group"
                            style={{ height: `${(d.count / max) * 100}%`, minHeight: d.count > 0 ? '4px' : '0' }}
                            title={`${d.date}: ${d.count} requests, ${d.tokens} tokens`}
                          >
                            <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:block rounded bg-gray-800 px-2 py-1 text-xs text-white whitespace-nowrap z-10">
                              {d.date}: {d.count} req
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                )}

                {/* Top companies */}
                {usage?.topCompanies && usage.topCompanies.length > 0 && (
                  <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                    <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">🏆 Top Companies by Usage</h3>
                    <div className="space-y-2">
                      {usage.topCompanies.map((c, i) => {
                        const max = usage.topCompanies[0]?.count || 1;
                        return (
                          <div key={c.companyId} className="flex items-center gap-3">
                            <span className="w-6 text-center text-sm font-bold text-gray-400">#{i + 1}</span>
                            <span className="w-36 text-sm text-gray-700 dark:text-gray-300 truncate">
                              {c.companyName || `Company #${c.companyId}`}
                            </span>
                            <div className="flex-1 h-5 bg-gray-100 rounded-full dark:bg-gray-700 overflow-hidden">
                              <div
                                className="h-full bg-linear-to-r from-blue-500 to-indigo-500 rounded-full transition-all"
                                style={{ width: `${(c.count / max) * 100}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium text-gray-500 w-16 text-right">{c.count} req</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {!usage && (
                  <div className="rounded-xl border-2 border-dashed border-gray-200 p-10 text-center dark:border-gray-700">
                    <p className="text-lg mb-2">📊</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      No usage data available yet. AI usage statistics will appear here once users start using the AI assistant.
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
