import { requirePermission } from "@/lib/auth/permissions";
import { PERMISSIONS } from "@/lib/auth/constants";
import { listCustomerNotifications } from "@/services/customer.service";
import NotificationList from "@/components/customer/notifications/NotificationList";
import PushOptIn from "@/components/customer/notifications/PushOptIn";

export default async function CustomerNotificationsPage() {
  const ctx = await requirePermission(PERMISSIONS.CUSTOMER_APP);

  const result = await listCustomerNotifications(ctx.userId, { page: 1, pageSize: 20 });

  return (
    <div>
      <PushOptIn />
      <NotificationList
        initialItems={result.items}
        initialTotal={result.total}
        initialUnreadCount={result.unreadCount}
      />
    </div>
  );
}
