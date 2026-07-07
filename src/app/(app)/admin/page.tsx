import { getAuditLogs, getDashboardStats } from "@/app/actions/admin";
import { AuditLogsClient } from "@/components/admin/AuditLogsClient";
import { Truck, Users, ShieldAlert } from "lucide-react";

export default async function AdminDashboard() {
  const [logs, stats] = await Promise.all([
    getAuditLogs(),
    getDashboardStats(),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-500 mt-1">Platform overview and system activity.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-lg"><Truck className="h-6 w-6" /></div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Trucks</p>
            <p className="text-2xl font-bold text-gray-900">{stats.trucksCount}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-100 text-indigo-600 rounded-lg"><Truck className="h-6 w-6" /></div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Trailers</p>
            <p className="text-2xl font-bold text-gray-900">{stats.trailersCount}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-green-100 text-green-600 rounded-lg"><Users className="h-6 w-6" /></div>
          <div>
            <p className="text-sm font-medium text-gray-500">Active Drivers</p>
            <p className="text-2xl font-bold text-gray-900">{stats.driversCount}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-red-100 text-red-600 rounded-lg"><ShieldAlert className="h-6 w-6" /></div>
          <div>
            <p className="text-sm font-medium text-gray-500">Open Claims</p>
            <p className="text-2xl font-bold text-gray-900">{stats.openClaimsCount}</p>
          </div>
        </div>
      </div>

      <AuditLogsClient logs={logs} />
    </div>
  );
}

