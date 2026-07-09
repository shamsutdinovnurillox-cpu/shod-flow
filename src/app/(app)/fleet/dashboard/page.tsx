import { getDashboardStats } from "@/app/actions/admin";
import { generateNotifications, getNotifications } from "@/app/actions/notifications";
import { NotificationsPanel } from "@/components/NotificationsPanel";
import { Truck, Container, Wrench, DollarSign, FileWarning, Bell } from "lucide-react";

function money(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

export default async function FleetDashboard() {
  await generateNotifications();
  const [stats, notifications] = await Promise.all([getDashboardStats(), getNotifications("FLEET")]);

  const cards = [
    {
      label: "Trucks",
      value: stats.trucksCount,
      sub: `${stats.trucksAssigned} assigned · ${stats.trucksUnassigned} unassigned · ${stats.trucksInService} in service`,
      icon: Truck,
      color: "bg-blue-100 text-blue-600",
    },
    {
      label: "Trailers",
      value: stats.trailersCount,
      sub: `${stats.trailersUnassigned} unassigned`,
      icon: Container,
      color: "bg-indigo-100 text-indigo-600",
    },
    {
      label: "Open Services",
      value: stats.openServices,
      sub: "In progress",
      icon: Wrench,
      color: "bg-yellow-100 text-yellow-600",
    },
    {
      label: "Monthly Service Cost",
      value: money(stats.monthlyServiceCost),
      sub: "This month",
      icon: DollarSign,
      color: "bg-emerald-100 text-emerald-600",
    },
    {
      label: "Monthly Expenses",
      value: money(stats.monthlyExpenses),
      sub: "This month",
      icon: DollarSign,
      color: "bg-teal-100 text-teal-600",
    },
    {
      label: "Expiring Documents",
      value: stats.expiringDocs,
      sub: "Within 30 days",
      icon: FileWarning,
      color: "bg-red-100 text-red-600",
    },
    {
      label: "Open Alerts",
      value: stats.openAlerts,
      sub: "Unresolved",
      icon: Bell,
      color: "bg-orange-100 text-orange-600",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-fg">Fleet Dashboard</h1>
        <p className="text-muted mt-1">Overview of trucks, trailers, services, and costs.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="bg-surface rounded-xl border border-border p-6 shadow-sm">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${c.color}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-muted">{c.label}</p>
                  <p className="text-2xl font-bold text-fg truncate">{c.value}</p>
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
