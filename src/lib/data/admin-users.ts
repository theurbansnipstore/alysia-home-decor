import "server-only";
import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";

export interface AdminStaffListItem {
  id: string;
  name: string;
  email: string;
  role: Role;
  isBlocked: boolean;
  createdAt: Date;
}

/** Staff/admin accounts only — role != CUSTOMER. Deliberately separate from Customers (src/lib/data/admin-customers.ts), which is scoped to role == CUSTOMER. */
export async function getAdminStaffList(): Promise<AdminStaffListItem[]> {
  const users = await prisma.user.findMany({
    where: { role: { not: "CUSTOMER" } },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, email: true, role: true, isBlocked: true, createdAt: true },
  });
  return users;
}

export async function getAdminStaffById(id: string): Promise<AdminStaffListItem | null> {
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, role: true, isBlocked: true, createdAt: true },
  });
  if (!user || user.role === "CUSTOMER") return null;
  return user;
}

export async function countSuperAdmins(): Promise<number> {
  return prisma.user.count({ where: { role: "SUPER_ADMIN" } });
}
