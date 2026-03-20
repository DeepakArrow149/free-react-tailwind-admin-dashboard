import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import client from "../../api/client";

interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  module: string | null;
  recordId: number | null;
  link: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

export default function NotificationCenterPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { limit: "100" };
      if (filter === "unread") params.isRead = "false";
      if (filter === "read") params.isRead = "true";
      const res = await client.get("/admin/notifications", { params });
      const data = res.data.data;
      setNotifications(data?.rows || []);
      setUnread(data?.unread || 0);
    } catch {
      toast.error("Failed to fetch notifications");
    }
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markRead = async (id: number) => {
    try {
      await client.patch(`/admin/notifications/${id}/read`);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n)));
      setUnread((u) => Math.max(0, u - 1));
    } catch {
      toast.error("Failed to mark as read");
    }
  };

  const markAllRead = async () => {
    try {
      await client.patch("/admin/notifications/read-all");
      toast.success("All marked as read");
      fetchNotifications();
    } catch {
      toast.error("Failed");
    }
  };

  const typeIcon = (type: string) => {
    const icons: Record<string, { icon: string; color: string }> = {
      INFO: { icon: "ℹ", color: "text-blue-500" },
      WARNING: { icon: "⚠", color: "text-yellow-500" },
      ERROR: { icon: "✕", color: "text-red-500" },
      APPROVAL: { icon: "✓", color: "text-green-500" },
      ALERT: { icon: "!", color: "text-orange-500" },
    };
    const item = icons[type] || icons.INFO;
    return <span className={`text-lg ${item.color}`}>{item.icon}</span>;
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  return (
    <div className="p-6 max-w-[900px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Notifications</h1>
          {unread > 0 && <p className="text-sm text-gray-500 mt-1">{unread} unread notification{unread > 1 ? "s" : ""}</p>}
        </div>
        {unread > 0 && (
          <button onClick={markAllRead} className="px-4 py-2 text-sm border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-gray-700">
            Mark all as read
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 dark:bg-gray-700 rounded-lg p-1 w-fit">
        {(["all", "unread", "read"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-md text-sm font-medium transition capitalize ${filter === f ? "bg-white dark:bg-gray-600 shadow text-blue-600" : "text-gray-500"}`}>
            {f}{f === "unread" && unread > 0 ? ` (${unread})` : ""}
          </button>
        ))}
      </div>

      {/* Notification list */}
      <div className="space-y-2">
        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading...</div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <div className="text-4xl mb-2">🔔</div>
            <p>No notifications</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={`flex items-start gap-4 p-4 rounded-xl border transition cursor-pointer
                ${n.isRead
                  ? "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                  : "bg-blue-50 dark:bg-gray-750 border-blue-200 dark:border-blue-800"
                }
                hover:shadow-md`}
              onClick={() => !n.isRead && markRead(n.id)}
            >
              <div className="flex-shrink-0 mt-1 w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                {typeIcon(n.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className={`text-sm font-medium ${n.isRead ? "text-gray-600 dark:text-gray-400" : "text-gray-800 dark:text-white"}`}>
                    {n.title}
                  </h3>
                  {!n.isRead && <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{n.message}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-xs text-gray-400">{timeAgo(n.createdAt)}</span>
                  {n.module && <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">{n.module}</span>}
                  {n.link && (
                    <a href={n.link} className="text-xs text-blue-600 hover:underline" onClick={(e) => e.stopPropagation()}>
                      View →
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
