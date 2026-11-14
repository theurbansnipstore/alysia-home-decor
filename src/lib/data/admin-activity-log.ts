import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

const DEFAULT_PAGE_SIZE = 20;

export interface AdminActivityLogFilters {
  page?: number;
  pageSize?: number;
  action?: string;
  entity?: string;
}

/** Mirrors listAllNotifications()'s shape exactly (src/lib/services/notifications/service.ts) — same pagination contract, same "oversight view" role tier. */
export async function listAdminActivityLog(filters: AdminActivityLogFilters = {}) {
  const { page = 1, pageSize = DEFAULT_PAGE_SIZE, action, entity } = filters;

  const where: Prisma.ActivityLogWhereInput = {
    ...(action ? { action } : {}),
    ...(entity ? { entity } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { user: { select: { id: true, name: true, email: true, role: true } } },
    }),
    prisma.activityLog.count({ where }),
  ]);

  return { items, pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) } };
}

/** Distinct action values actually present — powers the filter dropdown without hardcoding a list that could drift from what's really logged. */
export async function getDistinctActivityLogActions(): Promise<string[]> {
  const rows = await prisma.activityLog.findMany({ distinct: ["action"], select: { action: true }, orderBy: { action: "asc" } });
  return rows.map((r) => r.action);
}
