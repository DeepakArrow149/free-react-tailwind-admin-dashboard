import { useFeatureFlags, useUpdateFeatureFlag, useSeedFeatureFlags } from '@/hooks/useIeTools';
import PageMeta from '@/components/common/PageMeta';

export default function FeatureFlagsPage() {
  const { data, isLoading } = useFeatureFlags();
  const update = useUpdateFeatureFlag();
  const seed = useSeedFeatureFlags();
  const flags = Array.isArray(data) ? data : [];

  return (
    <>
      <PageMeta title="Feature Flags" description="Toggle IE module features" />
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Feature Flags</h1>
          <button className="rounded-lg bg-gray-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50" disabled={seed.isPending} onClick={() => seed.mutate()}>
            Seed Defaults
          </button>
        </div>

        <p className="text-sm text-gray-500">Enable or disable IE modules. Changes take effect immediately.</p>

        {isLoading && <p className="text-gray-500">Loading...</p>}

        <div className="space-y-2">
          {flags.map((flag: { id: number; moduleKey: string; label: string; enabled: boolean; description: string | null; updatedAt: string }) => (
            <div key={flag.id} className="flex items-center justify-between rounded-lg border border-gray-200 p-4 dark:border-gray-700 dark:bg-gray-900">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-gray-800 dark:text-white">{flag.label}</h3>
                  <span className="rounded bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-500 dark:bg-gray-800">{flag.moduleKey}</span>
                </div>
                {flag.description && <p className="mt-1 text-sm text-gray-500">{flag.description}</p>}
              </div>
              <button
                className={`relative ml-4 inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${flag.enabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}
                onClick={() => update.mutate({ id: flag.id, enabled: !flag.enabled })}
              >
                <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${flag.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          ))}
          {!isLoading && flags.length === 0 && <p className="text-center text-gray-500">No feature flags. Click "Seed Defaults" to initialize.</p>}
        </div>
      </div>
    </>
  );
}
