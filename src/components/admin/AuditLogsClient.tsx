"use client";

import { Activity } from "lucide-react";
import type { AuditLogWithUser } from "@/types/models";

export function AuditLogsClient({ logs }: { logs: AuditLogWithUser[] }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
          <Activity className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-bold text-fg">System Audit Logs</h2>
      </div>

      <div className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-muted">
            <thead className="bg-surface-2 text-fg">
              <tr>
                <th className="px-6 py-4 font-medium">Timestamp</th>
                <th className="px-6 py-4 font-medium">User</th>
                <th className="px-6 py-4 font-medium">Action</th>
                <th className="px-6 py-4 font-medium">Entity Type</th>
                <th className="px-6 py-4 font-medium">Entity ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted">
                    No logs found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-surface-2 transition-colors">
                    <td className="px-6 py-4">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="px-6 py-4 font-medium text-fg">{log.user?.email}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                        log.action === 'CREATE' ? 'bg-green-50 text-green-700' : 
                        log.action === 'UPDATE' ? 'bg-blue-50 text-blue-700' : 
                        log.action === 'DELETE' ? 'bg-red-50 text-red-700' : 'bg-surface-2 text-fg'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4">{log.entityType}</td>
                    <td className="px-6 py-4 font-mono text-xs">{log.entityId}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
