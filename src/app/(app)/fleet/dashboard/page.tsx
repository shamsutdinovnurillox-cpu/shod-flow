import Link from "next/link";
import { getDashboardStats, getRecentActivity } from "@/app/actions/admin";
import { generateNotifications, getNotifications } from "@/app/actions/notifications";
import { AlertsPanel } from "@/components/dashboard/AlertsPanel";
import { HeroBand, QuickActions, SectionHead, MetricTile, ActivityFeed } from "@/components/dashboard/parts";
import { DonutChart, ChartLegend, MeterRow, StackedBar } from "@/components/ui/charts";
import {
  Truck,
  Container,
  Wrench,
  Receipt,
  FileWarning,
  DollarSign,
  Upload,
  ChevronRight,
} from "lucide-react";

const money = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

function greetingFor(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default async function FleetDashboard() {
  await generateNotifications();
  const [stats, notifications, activity] = await Promise.all([
    getDashboardStats(),
    getNotifications("FLEET"),
    getRecentActivity(7),
  ]);

  const now = new Date();

  // --- Parkning tarkibi (haqiqiy statuslardan) ---
  const truckSlices = [
    { label: "Assigned", value: stats.trucksAssigned, color: "var(--series-1)" },
    { label: "Unassigned", value: stats.trucksUnassigned, color: "var(--series-2)" },
    { label: "In service", value: stats.trucksInService, color: "var(--series-4)" },
  ];
  const otherTrucks =
    stats.trucksCount - stats.trucksAssigned - stats.trucksUnassigned - stats.trucksInService;
  if (otherTrucks > 0) truckSlices.push({ label: "Other", value: otherTrucks, color: "var(--muted)" });

  // Dispatch uchun tayyor birliklar ulushi — servisda turganlar hisobga olinmaydi.
  const totalUnits = stats.trucksCount + stats.trailersCount;
  const readyUnits = totalUnits - stats.trucksInService;
  const readiness = totalUnits > 0 ? (readyUnits / totalUnits) * 100 : 100;

  const monthTotal = stats.monthlyServiceCost + stats.monthlyExpenses;
  const costSlices = [
    { label: "Service", value: stats.monthlyServiceCost, color: "var(--series-1)" },
    { label: "Other expenses", value: stats.monthlyExpenses, color: "var(--series-2)" },
  ];

  return (
    <div className="space-y-6">
      <HeroBand
        greeting={now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        title={greetingFor(now.getHours())}
        subtitle="Live picture of your trucks, trailers, maintenance and spend."
        score={readiness}
        scoreLabel="Fleet readiness"
        scoreHint={`${readyUnits} of ${totalUnits} units available for dispatch`}
        stats={[
          { label: "Trucks", value: stats.trucksCount },
          { label: "Trailers", value: stats.trailersCount },
          {
            label: "In service",
            value: stats.trucksInService,
            tone: stats.trucksInService > 0 ? "warning" : "default",
          },
          {
            // Pastdagi "Alerts" paneli ham shu ro'yxatni ko'rsatadi — raqamlar mos.
            label: "Open alerts",
            value: notifications.length,
            tone: notifications.length > 0 ? "danger" : "success",
          },
        ]}
        actions={
          <QuickActions
            items={[
              { label: "Add truck", href: "/fleet/trucks?new=1", icon: Truck },
              { label: "Add trailer", href: "/fleet/trailers?new=1", icon: Container },
              { label: "Schedule service", href: "/fleet/services?new=1", icon: Wrench },
              { label: "Log expense", href: "/fleet/expenses?new=1", icon: Receipt },
              { label: "Upload document", href: "/fleet/documents?new=1", icon: Upload },
            ]}
          />
        }
      />

      {/* --- Park tarkibi va bandlik --- */}
      <section className="grid gap-4 lg:grid-cols-3">
        <div className="panel lg:col-span-2">
          <div className="panel-head">
            <span className="panel-title">Fleet composition</span>
            <Link href="/fleet/trucks" className="inline-flex items-center gap-0.5 text-xs font-medium text-primary hover:underline">
              Manage <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="panel-body flex flex-col items-center gap-7 sm:flex-row sm:gap-9">
            <DonutChart
              slices={truckSlices}
              centerValue={stats.trucksCount}
              centerLabel="Trucks"
            />
            <div className="w-full min-w-0 flex-1 space-y-5">
              <ChartLegend slices={truckSlices} />
              <div className="space-y-3.5 border-t border-border pt-4">
                <MeterRow
                  label="Trucks assigned to drivers"
                  value={stats.trucksAssigned}
                  max={stats.trucksCount}
                  hint={`/ ${stats.trucksCount}`}
                  color="var(--series-1)"
                />
                <MeterRow
                  label="Trailers in use"
                  value={stats.trailersCount - stats.trailersUnassigned}
                  max={stats.trailersCount}
                  hint={`/ ${stats.trailersCount}`}
                  color="var(--series-6)"
                />
              </div>
            </div>
          </div>
        </div>

        {/* --- Oylik xarajat taqsimoti --- */}
        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">Spend this month</span>
            <Link href="/fleet/expenses" className="inline-flex items-center gap-0.5 text-xs font-medium text-primary hover:underline">
              Details <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="panel-body">
            <p className="metric-value text-[2rem]">{money(monthTotal)}</p>
            <p className="mt-1 text-xs text-muted">
              {now.toLocaleDateString("en-US", { month: "long" })} to date
            </p>

            <StackedBar slices={costSlices} height={10} className="mt-5" />

            <ul className="mt-4 space-y-3">
              {costSlices.map((s) => (
                <li key={s.label} className="flex items-center gap-2.5 text-sm">
                  <span className="dot" style={{ color: s.color }} />
                  <span className="flex-1 truncate text-muted">{s.label}</span>
                  <span className="font-semibold tabular-nums text-fg">{money(s.value)}</span>
                </li>
              ))}
            </ul>

            <div className="mt-5 flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2.5">
              <Wrench className="h-4 w-4 shrink-0 text-[var(--series-4)]" />
              <span className="text-xs text-muted">
                <strong className="font-semibold text-fg">{stats.openServices}</strong> service
                {stats.openServices === 1 ? "" : "s"} still in progress
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* --- KPI lentasi --- */}
      <section>
        <SectionHead title="Operational metrics" hint="Key numbers across maintenance, cost and compliance." />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricTile
            label="Open services"
            value={stats.openServices}
            hint="In progress"
            icon={Wrench}
            tone="var(--series-4)"
            href="/fleet/services"
          />
          <MetricTile
            label="Service cost"
            value={money(stats.monthlyServiceCost)}
            hint="This month"
            icon={DollarSign}
            tone="var(--series-1)"
            href="/fleet/services"
          />
          <MetricTile
            label="Other expenses"
            value={money(stats.monthlyExpenses)}
            hint="This month"
            icon={Receipt}
            tone="var(--series-2)"
            href="/fleet/expenses"
          />
          <MetricTile
            label="Expiring documents"
            value={stats.expiringDocs}
            hint="Within 30 days"
            icon={FileWarning}
            tone={stats.expiringDocs > 0 ? "var(--danger)" : "var(--series-3)"}
            href="/fleet/documents"
          />
        </div>
      </section>

      {/* --- Ogohlantirishlar + faoliyat --- */}
      <section className="grid items-start gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AlertsPanel notifications={notifications} viewAllHref="/fleet/notifications" />
        </div>
        <ActivityFeed entries={activity} />
      </section>
    </div>
  );
}
