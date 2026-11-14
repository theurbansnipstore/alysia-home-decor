import { requireRole } from "@/lib/session";
import { USER_MANAGEMENT_ROLES } from "@/lib/admin/users-roles";
import { getAdminStaffList } from "@/lib/data/admin-users";
import StaffTable from "@/components/admin/users/StaffTable";
import CreateStaffForm from "@/components/admin/users/CreateStaffForm";

export default async function AdminUsersPage() {
  const session = await requireRole(USER_MANAGEMENT_ROLES);
  const staff = await getAdminStaffList();

  return (
    <div>
      <h1 className="mb-2 font-display text-2xl text-ink">Users &amp; Roles</h1>
      <p className="mb-6 text-sm text-ink-500">
        Staff/admin accounts only — separate from Customers. Only SUPER_ADMIN can manage this area.
      </p>

      <CreateStaffForm />

      <StaffTable staff={staff} currentUserId={session.id} />
    </div>
  );
}
