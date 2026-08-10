import Link from "next/link";
import { getDashboardStats, getRecentActivity } from "@/app/actions/admin";
import { generateNotifications, getNotifications } from "@/app/actions/notifications";
import { AlertsPanel } from "@/components/dashboard/AlertsPanel";
import { HeroBand, QuickActions, SectionHead, MetricTile, ActivityFeed } from "@/components/dashboard/parts";
import { DonutChart, ChartLegend, MeterRow } from "@/components/ui/charts";
import {
  Users,
  ShieldAlert,
  AlertTriangle,
  ClipboardCheck,
  CreditCard,
  HeartPulse,
  FlaskConical,
  CalendarCheck,
  UserX,
  FileWarning,
  Upload,
  ChevronRight,
} from "lucide-react";

function greetingFor(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default async function SafetyDashboard() {
  await generateNotifications();
  const [stats, notifications, activity] = await Promise.all([
    getDashboardStats(),
    getNotifications("SAFETY"),
    getRecentActivity(7),
  ]);

  const now = new Date();

  // Compliance = muddati yaqinlashmagan aktiv haydovchilar ulushi.
  // CDL va med-karta bir haydovchida ustma-ust kelishi mumkin, shuning uchun
  // eng yomon holat (ikkisining kattasi) asos qilib olinadi — bu ko'rsatkichni
  // sun'iy ravishda yaxshilab yubormaydi.
  const atRisk = Math.max(stats.cdlExpiring, stats.medExpiring);
  const compliant = Math.max(0, stats.driversActive - atRisk);
  const complianceScore = stats.driversActive > 0 ? (compliant / stats.driversActive) * 100 : 100;

  const caseSlices = [
    { label: "Open accidents", value: stats.openAccidents, color: "var(--series-5)" },
    { label: "Open claims", value: stats.openClaims, color: "var(--series-4)" },
    { label: "Pending inspections", value: stats.pendingInspections, color: "var(--series-2)" },
  ];
  const openCases = caseSlices.reduce((s, x) => s + x.value, 0);

  return (
    <div className="space-y-6">
      <HeroBand
        greeting={now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        title={greetingFor(now.getHours())}
        subtitle="Driver compliance, open incidents and inspection readiness at a glance."
        score={complianceScore}
        scoreLabel="Driver compliance"
        scoreHint={`${compliant} of ${stats.driversActive} active drivers fully current`}
        stats={[
          { label: "Active drivers", value: stats.driversActive },
          { label: "Open cases", value: openCases, tone: openCases > 0 ? "warning" : "success" },
          {
            label: "Credentials due",
            value: stats.cdlExpiring + stats.medExpiring,
            tone: stats.cdlExpiring + stats.medExpiring > 0 ? "warning" : "default",
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
              { label: "Add driver", href: "/safety/drivers?new=1", icon: Users },
              { label: "Log accident", href: "/safety/accidents?new=1", icon: AlertTriangle },
              { label: "File claim", href: "/safety/cargo-claims?new=1", icon: ShieldAlert },
              { label: "Log inspection", href: "/safety/inspections?new=1", icon: ClipboardCheck },
              { label: "Upload document", href: "/safety/documents?new=1", icon: Upload },
            ]}
          />
        }
      />

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="panel lg:col-span-2">
          <div className="panel-head">
            <span className="panel-title">Open cases</span>
            <Link href="/safety/accidents" className="inline-flex items-center gap-0.5 text-xs font-medium text-primary hover:underline">
              Review <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="panel-body flex flex-col items-center gap-7 sm:flex-row sm:gap-9">
            <DonutChart slices={caseSlices} centerValue={openCases} centerLabel="Open" />
            <div className="w-full min-w-0 flex-1 space-y-5">
              <ChartLegend slices={caseSlices} />
              <div className="space-y-3.5 border-t border-border pt-4">
                <MeterRow
                  label="CDL expiring within 30 days"
                  value={stats.cdlExpiring}
                  max={Math.max(stats.driversActive, 1)}
                  hint={`/ ${stats.driversActive}`}
                  color="var(--warning)"
                />
                <MeterRow
                  label="Medical cards expiring within 30 days"
                  value={stats.medExpiring}
                  max={Math.max(stats.driversActive, 1)}
                  hint={`/ ${stats.driversActive}`}
                  color="var(--series-5)"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">Workforce</span>
            <Link href="/safety/drivers" className="inline-flex items-center gap-0.5 text-xs font-medium text-primary hover:underline">
              Drivers <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="panel-body">
            <p className="metric-value text-[2rem]">{stats.driversActive}</p>
            <p className="mt-1 text-xs text-muted">Active drivers on roster</p>

            <div className="mt-5 space-y-3.5">
              <MeterRow
                label="Fully compliant"
                value={compliant}
                max={Math.max(stats.driversActive, 1)}
                color="var(--success)"
              />
              <MeterRow
                label="Inspections this month"
                value={stats.inspectionsThisMonth}
                max={Math.max(stats.inspectionsThisMonth, stats.driversActive, 1)}
                color="var(--series-2)"
              />
            </div>

            <div className="mt-5 space-y-2">
              <div className="flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2.5">
                <UserX className="h-4 w-4 shrink-0 text-muted" />
                <span className="text-xs text-muted">
                  <strong className="font-semibold text-fg">{stats.driversTerminated}</strong> terminated
                </span>
              </div>
              {stats.occAccRejected > 0 && (
                <div className="flex items-center gap-2 rounded-lg bg-danger-soft px-3 py-2.5">
                  <ShieldAlert className="h-4 w-4 shrink-0 text-danger" />
                  <span className="text-xs text-muted">
                    <strong className="font-semibold text-fg">{stats.occAccRejected}</strong> OCC/ACC rejected
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section>
        <SectionHead title="Compliance metrics" hint="Credentials, incidents and inspection follow-up." />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <MetricTile label="CDL expiring" value={stats.cdlExpiring} hint="Within 30 days" icon={CreditCard}
            tone={stats.cdlExpiring > 0 ? "var(--warning)" : "var(--series-3)"} href="/safety/drivers" />
          <MetricTile label="Medical cards expiring" value={stats.medExpiring} hint="Within 30 days" icon={HeartPulse}
            tone={stats.medExpiring > 0 ? "var(--warning)" : "var(--series-3)"} href="/safety/drivers" />
          <MetricTile label="Open accidents" value={stats.openAccidents} hint="Pending" icon={AlertTriangle}
            tone={stats.openAccidents > 0 ? "var(--danger)" : "var(--series-3)"} href="/safety/accidents" />
          <MetricTile label="Open claims" value={stats.openClaims} hint="Pending" icon={ShieldAlert}
            tone={stats.openClaims > 0 ? "var(--danger)" : "var(--series-3)"} href="/safety/cargo-claims" />
          <MetricTile label="Post-accident tests" value={stats.pendingPostAccidentTests} hint="Pending completion" icon={FlaskConical}
            tone={stats.pendingPostAccidentTests > 0 ? "var(--danger)" : "var(--series-3)"} href="/safety/accidents" />
          <MetricTile label="Pending inspections" value={stats.pendingInspections} hint="Awaiting review" icon={ClipboardCheck}
            tone="var(--series-2)" href="/safety/inspections" />
          <MetricTile label="Inspections this month" value={stats.inspectionsThisMonth} hint="Since start of month" icon={CalendarCheck}
            tone="var(--series-1)" href="/safety/inspections" />
          <MetricTile label="Expired documents" value={stats.expiredDocs} hint="Past expiry date" icon={FileWarning}
            tone={stats.expiredDocs > 0 ? "var(--danger)" : "var(--series-3)"} href="/safety/documents" />
          <MetricTile label="OCC/ACC rejected" value={stats.occAccRejected} hint="Rejected drivers" icon={UserX}
            tone={stats.occAccRejected > 0 ? "var(--danger)" : "var(--series-3)"} href="/safety/insurance" />
        </div>
      </section>

      <section className="grid items-start gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AlertsPanel notifications={notifications} viewAllHref="/safety/notifications" />
        </div>
        <ActivityFeed entries={activity} />
      </section>
    </div>
  );
}
