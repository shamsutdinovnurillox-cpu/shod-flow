import { getDashboardStats } from "@/app/actions/admin";
import { generateNotifications, getNotifications } from "@/app/actions/notifications";
import { NotificationsPanel } from "@/components/NotificationsPanel";
import { Users, ShieldAlert, AlertTriangle, ClipboardCheck, CreditCard, HeartPulse, FlaskConical, CalendarCheck, UserX, FileWarning } from "lucide-react";

export default async function SafetyDashboard() {
  await generateNotifications();
  const [stats, notifications] = await Promise.all([getDashboardStats(), getNotifications("SAFETY")]);

  const cards = [
    { label: "Active Drivers", value: stats.driversActive, sub: `${stats.driversTerminated} terminated`, icon: Users, color: "bg-green-100 text-green-600" },
    { label: "CDL Expiring", value: stats.cdlExpiring, sub: "Within 30 days", icon: CreditCard, color: "bg-orange-100 text-orange-600" },
    { label: "Medical Cards Expiring", value: stats.medExpiring, sub: "Within 30 days", icon: HeartPulse, color: "bg-orange-100 text-orange-600" },
    { label: "Open Accidents", value: stats.openAccidents, sub: "Pending", icon: AlertTriangle, color: "bg-red-100 text-red-600" },
    { label: "Open Claims", value: stats.openClaims, sub: "Pending", icon: ShieldAlert, color: "bg-red-100 text-red-600" },
    { label: "Pending Inspections", value: stats.pendingInspections, sub: "Awaiting review", icon: ClipboardCheck, color: "bg-yellow-100 text-yellow-600" },
    { label: "Post-Accident Tests", value: stats.pendingPostAccidentTests, sub: "Pending completion", icon: FlaskConical, color: "bg-red-100 text-red-600" },
    { label: "Inspections This Month", value: stats.inspectionsThisMonth, sub: "Since start of month", icon: CalendarCheck, color: "bg-blue-100 text-blue-600" },
    { label: "OCC/ACC Rejected", value: stats.occAccRejected, sub: "Rejected drivers", icon: UserX, color: "bg-red-100 text-red-600" },
    { label: "Expired Documents", value: stats.expiredDocs, sub: "Past expiry date", icon: FileWarning, color: "bg-orange-100 text-orange-600" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-fg">Safety Dashboard</h1>
        <p className="text-muted mt-1">Driver compliance, incidents, and inspections.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="bg-surface rounded-xl border border-border p-6 shadow-sm">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${c.color}`}><Icon className="h-6 w-6" /></div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-muted">{c.label}</p>
                  <p className="text-2xl font-bold text-fg">{c.value}</p>
                </div>
              </div>
              <p className="text-xs text-faint mt-3">{c.sub}</p>
            </div>
          );
        })}
      </div>

      <NotificationsPanel notifications={notifications} />
    </div>
  );
}
