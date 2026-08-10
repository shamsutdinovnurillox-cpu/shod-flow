import { generateNotifications, getNotifications } from "@/app/actions/notifications";
import { NotificationsPanel } from "@/components/NotificationsPanel";
import { requireModule } from "@/lib/auth-guard";

export default async function FleetNotificationsPage() {
  await requireModule("fleet.notifications");
  await generateNotifications();
  const notifications = await getNotifications("FLEET");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-fg">Fleet Notifications</h1>
        <p className="text-muted mt-1">Expirations, prolonged statuses, open services, and pending expenses.</p>
      </div>
      <NotificationsPanel notifications={notifications} />
    </div>
  );
}
