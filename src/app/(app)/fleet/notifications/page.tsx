import { generateNotifications, getNotifications } from "@/app/actions/notifications";
import { NotificationsPanel } from "@/components/NotificationsPanel";
import { PageHeader } from "@/components/ui/page-header";
import { requireModule } from "@/lib/auth-guard";

export default async function FleetNotificationsPage() {
  await requireModule("fleet.notifications");
  await generateNotifications();
  const notifications = await getNotifications("FLEET");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fleet Notifications"
        subtitle="Expirations, prolonged statuses, open services, and pending expenses."
      />
      <NotificationsPanel notifications={notifications} />
    </div>
  );
}
