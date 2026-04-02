import { prisma } from "@/lib/prisma";
import type { OwnerUserRow } from "@/types/owner";

export async function getOwnerUsers(tenantId: string): Promise<OwnerUserRow[]> {
  const storeMemberships = await prisma.storeMembership.findMany({
    where: {
      tenantId,
      status: { not: "REMOVED" },
    },
    include: {
      membership: {
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      },
      store: { select: { name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return storeMemberships.map((sm) => ({
    storeMembershipId: sm.id,
    userId: sm.membership.userId,
    name: sm.membership.user.name,
    email: sm.membership.user.email,
    storeRole: sm.role,
    membershipRole: sm.membership.role,
    status: sm.status,
    joinedAt: sm.createdAt.toISOString(),
    storeName: sm.store.name,
  }));
}
