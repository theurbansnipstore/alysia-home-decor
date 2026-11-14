import { requireRole } from "@/lib/session";
import { NOTIFICATION_ADMIN_ROLES } from "@/lib/admin/notification-roles";
import { listAllNotifications } from "@/lib/services/notifications/service";
import AdminNotificationTable from "@/components/admin/notifications/AdminNotificationTable";

export default async function AdminNotificationsPage() {
  await requireRole(NOTIFICATION_ADMIN_ROLES);
  const { items, pagination } = await listAllNotifications({ page: 1 });

  return (
    <div>
      <h1 className="mb-1 font-display text-2xl text-ink">Notifications</h1>
      <p className="mb-6 text-sm text-ink-500">
        Every notification sent to every staff member and customer — an oversight view, not just your own.
      </p>
      <AdminNotificationTable
        initialItems={items.map((i) => ({
          ...i,
          createdAt: i.createdAt.toISOString(),
          readAt: i.readAt?.toISOString() ?? null,
        }))}
        initialPagination={pagination}
      />
    </div>
  );
}
