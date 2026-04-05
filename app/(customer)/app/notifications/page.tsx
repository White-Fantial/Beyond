import { requirePermission } from "@/lib/auth/permissions";
import { PERMISSIONS } from "@/lib/auth/constants";
import { listCustomerNotifications, getUserPushPreferences } from "@/services/customer.service";
import NotificationList from "@/components/customer/notifications/NotificationList";
import PushOptIn from "@/components/customer/notifications/PushOptIn";
import PushPreferencePanel from "@/components/customer/notifications/PushPreferencePanel";

export default async function CustomerNotificationsPage() {
  const ctx = await requirePermission(PERMISSIONS.CUSTOMER_APP);

  const [result, prefs] = await Promise.all([
    listCustomerNotifications(ctx.userId, { page: 1, pageSize: 20 }),
    getUserPushPreferences(ctx.userId),
  ]);

  return (
    <div className="space-y-4">
      <PushOptIn />
      <PushPreferencePanel initialPrefs={prefs} />
      <NotificationList
        initialItems={result.items}
        initialTotal={result.total}
        initialUnreadCount={result.unreadCount}
      />
    </div>
  );
}
