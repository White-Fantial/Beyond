/**
 * Backoffice Staff Service — Phase 4.
 *
 * Provides staff roster and store hours/scheduling data for store managers.
 * All queries are scoped to storeId.
 */
import { prisma } from "@/lib/prisma";
import type {
  BackofficeStaffMember,
  BackofficeStaffListResult,
  BackofficeUpdateStaffRoleInput,
  BackofficeStoreHours,
  BackofficeScheduleData,
  StoreRoleKey,
  StoreMembershipStatus,
} from "@/types/backoffice";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function toStaffMember(row: {
  id: string;
  membershipId: string;
  role: string;
  status: string;
  membership: {
    id: string;
    userId: string;
    joinedAt: Date | null;
    user: { name: string; email: string; lastLoginAt: Date | null };
  };
}): BackofficeStaffMember {
  return {
    membershipId: row.membershipId,
    storeMembershipId: row.id,
    userId: row.membership.userId,
    name: row.membership.user.name,
    email: row.membership.user.email,
    role: row.role as StoreRoleKey,
    status: row.status as StoreMembershipStatus,
    joinedAt: row.membership.joinedAt?.toISOString() ?? null,
    lastLoginAt: row.membership.user.lastLoginAt?.toISOString() ?? null,
  };
}

function toStoreHours(row: {
  id: string;
  dayOfWeek: number;
  isOpen: boolean;
  openTimeLocal: string;
  closeTimeLocal: string;
  pickupStartTimeLocal: string | null;
  pickupEndTimeLocal: string | null;
}): BackofficeStoreHours {
  return {
    id: row.id,
    dayOfWeek: row.dayOfWeek,
    dayLabel: DAY_LABELS[row.dayOfWeek] ?? "?",
    isOpen: row.isOpen,
    openTimeLocal: row.openTimeLocal,
    closeTimeLocal: row.closeTimeLocal,
    pickupStartTimeLocal: row.pickupStartTimeLocal,
    pickupEndTimeLocal: row.pickupEndTimeLocal,
  };
}

// ─── Public functions ─────────────────────────────────────────────────────────

/**
 * List all staff members for a store with their roles and status.
 */
export async function listStaffMembers(
  storeId: string
): Promise<BackofficeStaffListResult> {
  const rows = await prisma.storeMembership.findMany({
    where: { storeId, status: { not: "REMOVED" } },
    orderBy: { createdAt: "asc" },
    include: {
      membership: {
        include: {
          user: {
            select: { name: true, email: true, lastLoginAt: true },
          },
        },
      },
    },
  });

  const items = rows.map(toStaffMember);
  return { items, total: items.length };
}

/**
 * Update a staff member's role or status within a store.
 */
export async function updateStaffMember(
  storeId: string,
  storeMembershipId: string,
  input: BackofficeUpdateStaffRoleInput
): Promise<BackofficeStaffMember> {
  const existing = await prisma.storeMembership.findFirst({
    where: { id: storeMembershipId, storeId },
  });
  if (!existing) {
    throw new Error(`Staff member ${storeMembershipId} not found in store ${storeId}`);
  }

  const updated = await prisma.storeMembership.update({
    where: { id: storeMembershipId },
    data: {
      ...(input.role ? { role: input.role } : {}),
      ...(input.status ? { status: input.status } : {}),
    },
    include: {
      membership: {
        include: {
          user: {
            select: { name: true, email: true, lastLoginAt: true },
          },
        },
      },
    },
  });

  return toStaffMember(updated);
}

/**
 * Get store hours / schedule for the week.
 */
export async function getScheduleData(storeId: string): Promise<BackofficeScheduleData> {
  const rows = await prisma.storeHours.findMany({
    where: { storeId },
    orderBy: { dayOfWeek: "asc" },
  });

  return {
    storeId,
    hours: rows.map(toStoreHours),
  };
}
