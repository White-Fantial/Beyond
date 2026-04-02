import { prisma } from "@/lib/prisma";
import type { OwnerDashboardSummary } from "@/types/owner";

/** Returns mock dashboard summary. Will connect to analytics tables in a later phase. */
export async function getOwnerDashboardSummary(tenantId: string): Promise<OwnerDashboardSummary> {
  // Fetch real connection statuses
  const connections = await prisma.connection.findMany({
    where: { tenantId, status: { not: "DISCONNECTED" } },
    select: { type: true, status: true },
  });

  function getConnectionStatus(
    type: string
  ): "CONNECTED" | "ERROR" | "NOT_CONNECTED" {
    const conn = connections.find((c) => c.type === type);
    if (!conn) return "NOT_CONNECTED";
    if (conn.status === "CONNECTED") return "CONNECTED";
    if (conn.status === "ERROR" || conn.status === "REAUTH_REQUIRED") return "ERROR";
    return "NOT_CONNECTED";
  }

  // Fetch recent connection action logs as recent log entries
  const actionLogs = await prisma.connectionActionLog.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      id: true,
      actionType: true,
      status: true,
      provider: true,
      errorCode: true,
      createdAt: true,
    },
  });

  const recentLogs = actionLogs.map((log) => ({
    id: log.id,
    message: `[${log.provider}] ${log.actionType} — ${log.status}${log.errorCode ? ` (${log.errorCode})` : ""}`,
    level: (log.status === "SUCCESS" ? "INFO" : "ERROR") as "INFO" | "WARN" | "ERROR",
    occurredAt: log.createdAt.toISOString(),
  }));

  // Mock sales & order data (replace with analytics table later)
  return {
    todaySales: 0,
    thisWeekSales: 0,
    ordersToday: 0,
    soldOutItemsCount: 0,
    posConnectionStatus: getConnectionStatus("POS"),
    deliveryConnectionStatus: getConnectionStatus("DELIVERY"),
    paymentConnectionStatus: getConnectionStatus("PAYMENT"),
    recentLogs,
  };
}
