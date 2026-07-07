"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateNotificationStatus } from "@/app/actions/notifications";
import type { Notification } from "@prisma/client";
import { Bell, Check, Clock } from "lucide-react";

const PRIORITY_STYLES: Record<string, string> = {
  CRITICAL: "bg-red-50 text-red-700 border-red-200",
  HIGH: "bg-orange-50 text-orange-700 border-orange-200",
  MEDIUM: "bg-yellow-50 text-yellow-700 border-yellow-200",
  LOW: "bg-gray-50 text-gray-600 border-gray-200",
};

export function NotificationsPanel({ notifications }: { notifications: Notification[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  const act = async (id: string, status: "RESOLVED" | "SNOOZED") => {
    setBusy(id);
    try {
      await updateNotificationStatus(id, status);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Amaliyot bajarilmadi.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <Bell className="h-5 w-5 text-gray-700" />
        <h2 className="text-xl font-bold text-gray-900">Notifications</h2>
        <span className="ml-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">{notifications.length}</span>
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-10 text-gray-500">No open notifications. All clear!</div>
      ) : (
        <ul className="space-y-3">
          {notifications.map((n) => (
            <li key={n.id} className={`flex items-start justify-between gap-4 rounded-lg border p-4 ${PRIORITY_STYLES[n.priority] ?? PRIORITY_STYLES.LOW}`}>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-white/70 px-2 py-0.5 text-xs font-bold">{n.priority}</span>
                  {n.status === "SNOOZED" && <span className="text-xs italic">snoozed</span>}
                </div>
                <p className="mt-1 text-sm font-medium">{n.message}</p>
                {n.dueDate && <p className="text-xs opacity-70 mt-0.5">Due: {new Date(n.dueDate).toLocaleDateString()}</p>}
              </div>
              <div className="flex shrink-0 gap-2">
                {n.status !== "SNOOZED" && (
                  <button onClick={() => act(n.id, "SNOOZED")} disabled={busy === n.id} title="Snooze"
                    className="rounded-md bg-white/70 p-1.5 hover:bg-white disabled:opacity-50"><Clock className="h-4 w-4" /></button>
                )}
                <button onClick={() => act(n.id, "RESOLVED")} disabled={busy === n.id} title="Resolve"
                  className="rounded-md bg-white/70 p-1.5 hover:bg-white disabled:opacity-50"><Check className="h-4 w-4" /></button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
