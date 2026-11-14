import { requireRole } from "@/lib/session";
import { ACTIVITY_LOG_ADMIN_ROLES } from "@/lib/admin/activity-log-roles";
import { listAdminActivityLog, getDistinctActivityLogActions } from "@/lib/data/admin-activity-log";
import AdminActivityLogTable from "@/components/admin/activity-log/AdminActivityLogTable";

export default async function AdminActivityLogPage() {
  await requireRole(ACTIVITY_LOG_ADMIN_ROLES);
  const [{ items, pagination }, actions] = await Promise.all([
    listAdminActivityLog({ page: 1 }),
    getDistinctActivityLogActions(),
  ]);

  return (
    <div>
      <h1 className="mb-1 font-display text-2xl text-ink">Activity Log</h1>
      <p className="mb-6 text-sm text-ink-500">Every logged administrative action — who did what, and when.</p>
      <AdminActivityLogTable
        initialItems={items.map((i) => ({
          ...i,
          createdAt: i.createdAt.toISOString(),
          // Always an object or null by construction — every write goes through
          // the typed logActivity() helper, never a primitive/array metadata value.
          metadata: i.metadata as Record<string, unknown> | null,
        }))}
        initialPagination={pagination}
        actionOptions={actions}
      />
    </div>
  );
}
