import "server-only";
import { prisma } from "@/lib/prisma";
import { Prisma, type Role } from "@prisma/client";
import type { NotificationEventType } from "@/lib/services/notifications/types";

const DEFAULT_PAGE_SIZE = 20;

export interface FanOutNotificationInput {
  roles: Role[];
  type: NotificationEventType;
  title: string;
  message: string;
  link?: string | null;
  metadata?: Record<string, unknown>;
  /** Excludes the actor who triggered the event, if they happen to hold one
   *  of the target roles (e.g. an ADMIN placing their own test order
   *  shouldn't notify themselves as "new order"). */
  excludeUserId?: string;
}

/** One row per recipient — admin/staff notifications "fan out" to every
 *  user currently holding one of the target roles, rather than one shared
 *  row, so each recipient's read state is independent. Recipient count is
 *  small (staff, not customers), so a plain findMany + createMany is fine
 *  — no batching/pagination needed here.
 *
 *  This is the ONLY writer of Notification rows (Module 19 decision):
 *  customers get email/WhatsApp only, no in-app row — the Notification
 *  table exists purely for admin/staff operational alerts. */
export async function createNotificationsForRoles(input: FanOutNotificationInput) {
  const recipients = await prisma.user.findMany({
    where: {
      role: { in: input.roles },
      isBlocked: false,
      ...(input.excludeUserId ? { id: { not: input.excludeUserId } } : {}),
    },
    select: { id: true },
  });
  if (recipients.length === 0) return { count: 0 };

  return prisma.notification.createMany({
    data: recipients.map((r) => ({
      userId: r.id,
      type: input.type,
      title: input.title,
      message: input.message,
      link: input.link ?? null,
      metadata: (input.metadata as Prisma.InputJsonValue) ?? undefined,
    })),
  });
}

export interface ListAllNotificationsInput {
  page?: number;
  pageSize?: number;
  unreadOnly?: boolean;
  type?: string;
}

/** Powers the admin-only oversight page (/admin/notifications,
 *  NOTIFICATION_ADMIN_ROLES-gated) — every recipient's rows, not scoped to
 *  one user, since this table is now exclusively admin/staff alerts. */
export async function listAllNotifications(input: ListAllNotificationsInput = {}) {
  const { page = 1, pageSize = DEFAULT_PAGE_SIZE, unreadOnly, type } = input;
  const where = {
    ...(unreadOnly ? { readAt: null } : {}),
    ...(type ? { type } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { user: { select: { id: true, name: true, email: true, role: true } } },
    }),
    prisma.notification.count({ where }),
  ]);

  return { items, pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) } };
}

export async function markAnyNotificationRead(notificationId: string) {
  return prisma.notification.update({ where: { id: notificationId }, data: { readAt: new Date() } });
}
