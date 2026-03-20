import PageMeta from "./PageMeta";

interface ModulePageProps {
  title: string;
  module: string;
  description: string;
  features: string[];
  icon: React.ReactNode;
  status?: "coming-soon" | "in-progress";
}

export default function ModulePage({ title, module, description, features, icon, status = "coming-soon" }: ModulePageProps) {
  return (
    <>
      <PageMeta title={`${title} | ERP TRACK`} description={description} />
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3 p-5 lg:p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/10">
            {icon}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">{title}</h2>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                status === "in-progress"
                  ? "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
                  : "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
              }`}>
                {status === "in-progress" ? "In Development" : "Coming Soon"}
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{module}</p>
          </div>
        </div>

        {/* Description */}
        <div className="mb-8 rounded-xl bg-gray-50 p-5 dark:bg-gray-800">
          <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">{description}</p>
        </div>

        {/* Planned Features */}
        <div>
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Planned Features
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-lg border border-gray-100 bg-white p-4 dark:border-gray-700 dark:bg-gray-800/50"
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-500/10">
                  <svg className="h-3 w-3 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                <span className="text-sm text-gray-700 dark:text-gray-300">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
