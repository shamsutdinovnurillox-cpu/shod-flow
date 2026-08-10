import { getAuditLogs, getDashboardStats } from "@/app/actions/admin";
import { AuditLogsClient } from "@/components/admin/AuditLogsClient";
import { HeroBand, QuickActions, SectionHead, MetricTile } from "@/components/dashboard/parts";
import { DonutChart, ChartLegend } from "@/components/ui/charts";
import {
  Truck,
  Container,
  Users,
  ShieldAlert,
  UserCog,
  Wrench,
  FileWarning,
  Bell,
  AlertTriangle,
} from "lucide-react";

export default async function AdminDashboard() {
  const [logs, stats] = await Promise.all([getAuditLogs(), getDashboardStats()]);

  const now = new Date();

  const assetSlices = [
    { label: "Trucks", value: stats.trucksCount, color: "var(--series-1)" },
    { label: "Trailers", value: stats.trailersCount, color: "var(--series-6)" },
    { label: "Active drivers", value: stats.driversActive, color: "var(--series-3)" },
  ];
  const totalAssets = assetSlices.reduce((s, x) => s + x.value, 0);

  // Platforma "sog'lig'i": ochiq ogohlantirishlar va muddati o'tgan hujjatlar
  // umumiy resurslarga nisbatan qancha kamligi.
  const problems = stats.openAlerts + stats.expiredDocs;
  const health = totalAssets > 0 ? Math.max(0, 100 - (problems / totalAssets) * 100) : 100;

  return (
    <div className="space-y-6">
      <HeroBand
        greeting={now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        title="Admin control"
        subtitle="Platform-wide inventory, compliance signals and the full audit trail."
        score={health}
        scoreLabel="Platform health"
        scoreHint={`${problems} open issue${problems === 1 ? "" : "s"} across ${totalAssets} tracked records`}
        stats={[
          { label: "Trucks", value: stats.trucksCount },
          { label: "Trailers", value: stats.trailersCount },
          { label: "Drivers", value: stats.driversActive },
          {
            label: "Open alerts",
            value: stats.openAlerts,
            tone: stats.openAlerts > 0 ? "danger" : "success",
          },
        ]}
        actions={
          <QuickActions
            items={[
              { label: "Manage users", href: "/admin/users", icon: UserCog },
              { label: "Add truck", href: "/fleet/trucks?new=1", icon: Truck },
              { label: "Add driver", href: "/safety/drivers?new=1", icon: Users },
            ]}
          />
        }
      />

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">Tracked records</span>
          </div>
          <div className="panel-body flex flex-col items-center gap-6 sm:flex-row">
            <DonutChart slices={assetSlices} size={148} centerValue={totalAssets} centerLabel="Total" />
            <ChartLegend slices={assetSlices} />
          </div>
        </div>

        <div className="lg:col-span-2">
          <SectionHead title="Signals" hint="Anything that needs an administrator's attention." />
          <div className="grid gap-3 sm:grid-cols-2">
            <MetricTile label="Open alerts" value={stats.openAlerts} hint="Unresolved" icon={Bell}
              tone={stats.openAlerts > 0 ? "var(--danger)" : "var(--series-3)"} />
            <MetricTile label="Expired documents" value={stats.expiredDocs} hint="Past expiry date" icon={FileWarning}
              tone={stats.expiredDocs > 0 ? "var(--danger)" : "var(--series-3)"} />
            <MetricTile label="Open claims" value={stats.openClaims} hint="Pending" icon={ShieldAlert}
              tone={stats.openClaims > 0 ? "var(--warning)" : "var(--series-3)"} href="/safety/cargo-claims" />
            <MetricTile label="Open accidents" value={stats.openAccidents} hint="Pending" icon={AlertTriangle}
              tone={stats.openAccidents > 0 ? "var(--warning)" : "var(--series-3)"} href="/safety/accidents" />
            <MetricTile label="Open services" value={stats.openServices} hint="In progress" icon={Wrench}
              tone="var(--series-4)" href="/fleet/services" />
            <MetricTile label="Unassigned trailers" value={stats.trailersUnassigned} hint="Idle inventory" icon={Container}
              tone="var(--series-6)" href="/fleet/trailers" />
          </div>
        </div>
      </section>

      <section>
        <SectionHead title="Audit trail" hint="Every change recorded across the platform." />
        <AuditLogsClient logs={logs} />
      </section>
    </div>
  );
}
