import { useEffect, useState } from "react";
import { Link } from "react-router";
import api from "../../api/client";
import PageMeta from "../../components/common/PageMeta";
import {
  BoxIconLine,
  ShootingStarIcon,
  GroupIcon,
} from "../../icons";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type R = any;

const statusColors: Record<string, string> = {
  DRAFT: "text-gray-600 dark:text-gray-400",
  CONFIRMED: "text-blue-600 dark:text-blue-400",
  IN_PRODUCTION: "text-amber-600 dark:text-amber-400",
  COMPLETED: "text-green-600 dark:text-green-400",
  SHIPPED: "text-purple-600 dark:text-purple-400",
  CANCELLED: "text-red-500",
};

function fmtDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtCur(n: number) {
  return "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

export default function Home() {
  const [data, setData] = useState<R>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const resp = await api.get("/dashboard/summary");
        setData(resp.data?.data ?? resp.data);
      } catch {
        /* silently fallback to zeros */
      }
      setLoading(false);
    })();
  }, []);

  const s = data?.stats ?? { activeBuyers: 0, activeSuppliers: 0, activeStyles: 0, pendingOrders: 0, totalOrders: 0 };

  const statCards = [
    { title: "Active Buyers", value: s.activeBuyers, icon: GroupIcon, color: "bg-blue-50 dark:bg-blue-900/20", textColor: "text-blue-600 dark:text-blue-400" },
    { title: "Pending Orders", value: s.pendingOrders, icon: ShootingStarIcon, color: "bg-amber-50 dark:bg-amber-900/20", textColor: "text-amber-600 dark:text-amber-400" },
    { title: "Active Styles", value: s.activeStyles, icon: BoxIconLine, color: "bg-green-50 dark:bg-green-900/20", textColor: "text-green-600 dark:text-green-400" },
    { title: "Active Suppliers", value: s.activeSuppliers, icon: GroupIcon, color: "bg-purple-50 dark:bg-purple-900/20", textColor: "text-purple-600 dark:text-purple-400" },
  ];

  const recentOrders: R[] = data?.recentOrders ?? [];
  const production: Record<string, number> = data?.production ?? {};
  const prodTotal = Object.values(production).reduce((a: number, b: number) => a + b, 0);

  return (
    <>
      <PageMeta title="Dashboard | ERP TRACK" description="ERP TRACK Dashboard" />
      <div className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {statCards.map((c) => (
            <div key={c.title} className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${c.color}`}>
                <c.icon className={`h-6 w-6 ${c.textColor}`} />
              </div>
              <div className="mt-4">
                <span className="text-2xl font-bold text-gray-800 dark:text-white/90">
                  {loading ? "…" : c.value.toLocaleString()}
                </span>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{c.title}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3">
          <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[
              { label: "New Buyer", href: "/master/buyers/new" },
              { label: "New Supplier", href: "/master/suppliers/new" },
              { label: "New Style", href: "/master/styles/new" },
              { label: "New Material", href: "/master/materials/new" },
              { label: "New Order", href: "/merchandising/orders" },
              { label: "New Cost Sheet", href: "/costing/cost-sheets" },
            ].map((a) => (
              <Link key={a.label} to={a.href}
                className="flex items-center justify-center rounded-lg border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 dark:border-gray-700 dark:text-gray-300 dark:hover:border-blue-600 dark:hover:bg-blue-900/20 dark:hover:text-blue-400">
                {a.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Bottom panels */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {/* Recent Orders */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Recent Orders</h3>
              <Link to="/merchandising/orders" className="text-sm text-brand-500 hover:underline">View all</Link>
            </div>
            {loading ? (
              <p className="text-sm text-gray-400">Loading…</p>
            ) : recentOrders.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No orders yet. Create your first buyer order to get started.</p>
            ) : (
              <div className="space-y-3">
                {recentOrders.map((o: R) => (
                  <div key={o.id} className="flex items-center justify-between rounded-lg bg-gray-50 dark:bg-gray-800 p-3">
                    <div>
                      <p className="text-sm font-medium text-gray-800 dark:text-white">{o.orderNo}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{o.buyer?.name} &middot; {o.style?.styleNo} &middot; EFD {fmtDate(o.exFactoryDate)}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-xs font-semibold ${statusColors[o.status] ?? "text-gray-500"}`}>{o.status}</p>
                      <p className="text-xs text-gray-500">{fmtCur(o.totalValue ?? 0)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Production Status */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3">
            <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">Production Status</h3>
            {loading ? (
              <p className="text-sm text-gray-400">Loading…</p>
            ) : prodTotal === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No production data available. Set up production plans to see status here.</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(production).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700 dark:text-gray-300">{status.replace(/_/g, " ")}</span>
                    <div className="flex items-center gap-3 flex-1 ml-4">
                      <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-brand-500 rounded-full" style={{ width: `${Math.round((count / prodTotal) * 100)}%` }} />
                      </div>
                      <span className="text-sm font-medium text-gray-800 dark:text-white w-8 text-right">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
