import { History } from "lucide-react";

interface TimelineLog {
  id: string;
  action: string;
  timestamp: Date | string;
  details: unknown;
  user: { name: string | null; email: string | null };
}

const ACTION_STYLES: Record<string, string> = {
  CREATE: "bg-green-50 text-green-700",
  UPDATE: "bg-blue-50 text-blue-700",
  STATUS_CHANGE: "bg-yellow-50 text-yellow-700",
  DELETE: "bg-red-50 text-red-700",
  UPLOAD: "bg-indigo-50 text-indigo-700",
  ASSIGN: "bg-emerald-50 text-emerald-700",
  MOVE: "bg-purple-50 text-purple-700",
  DROP: "bg-orange-50 text-orange-700",
};

/** AuditLog.details diffini qisqa o'qiladigan matnga aylantiradi. */
function detailsSummary(details: unknown): string | null {
  if (!details || typeof details !== "object") return null;
  const parts: string[] = [];
  for (const [key, value] of Object.entries(details as Record<string, unknown>)) {
    if (value && typeof value === "object" && "from" in value && "to" in value) {
      const v = value as { from: unknown; to: unknown };
      parts.push(`${key}: ${v.from ?? "—"} → ${v.to ?? "—"}`);
    } else {
      parts.push(`${key}: ${String(value)}`);
    }
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}

/** Yozuvning audit tarixi — detail sahifalardagi timeline (PRD 5.4). */
export function AuditTimeline({ logs }: { logs: TimelineLog[] }) {
  return (
    <div className="rounded-xl border border-border bg-surface shadow-sm p-6">
      <h2 className="text-lg font-bold text-fg mb-3 flex items-center gap-2">
        <History className="h-5 w-5 text-muted" /> Timeline
      </h2>
      {logs.length === 0 ? (
        <p className="text-sm text-muted py-2">No history yet.</p>
      ) : (
        <ul className="divide-y divide-border">
          {logs.map((log) => {
            const summary = detailsSummary(log.details);
            return (
              <li key={log.id} className="py-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold shrink-0 ${ACTION_STYLES[log.action] ?? "bg-surface-2 text-muted"}`}>
                      {log.action}
                    </span>
                    <span className="text-fg font-medium truncate">{log.user.name ?? log.user.email ?? "Unknown"}</span>
                  </div>
                  <span className="text-xs text-muted shrink-0">{new Date(log.timestamp).toLocaleString()}</span>
                </div>
                {summary && <p className="text-xs text-faint mt-1 break-words">{summary}</p>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
