import { generateNotifications, getNotifications } from "@/app/actions/notifications";
import { NotificationsPanel } from "@/components/NotificationsPanel";
import { requireModule } from "@/lib/auth-guard";

export default async function SafetyNotificationsPage() {
  await requireModule("safety.notifications");
  await generateNotifications();
  const notifications = await getNotifications("SAFETY");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-fg">Safety Notifications</h1>
        <p className="text-muted mt-1">CDL/medical expirations, incidents, inspections, and insurance alerts.</p>
      </div>
      <NotificationsPanel notifications={notifications} />
    </div>
  );
}
