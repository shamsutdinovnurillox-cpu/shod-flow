import { generateNotifications, getNotifications } from "@/app/actions/notifications";
import { PageHeader } from "@/components/ui/page-header";
import { NotificationsPanel } from "@/components/NotificationsPanel";
import { requireModule } from "@/lib/auth-guard";

export default async function SafetyNotificationsPage() {
  await requireModule("safety.notifications");
  await generateNotifications();
  const notifications = await getNotifications("SAFETY");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Safety Notifications"
        subtitle="CDL/medical expirations, incidents, inspections, and insurance alerts."
      />
      <NotificationsPanel notifications={notifications} />
    </div>
  );
}
