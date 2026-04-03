import { type NextRequest } from "next/server";
import { getCurrentUserAuthContext } from "@/lib/auth/context";
import { OWNER_PORTAL_MEMBERSHIP_ROLES } from "@/lib/auth/constants";
import {
  subscribe,
  formatSSEMessage,
  formatHeartbeat,
} from "@/lib/sse/stream-manager";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/sse/owner/notifications
 *
 * SSE stream for the owner notification bell.
 * Sends the current unread count immediately, then heartbeats.
 * The NotificationBell subscribes to this on mount.
 */
export async function GET(req: NextRequest) {
  const ctx = await getCurrentUserAuthContext();
  if (!ctx) {
    return new Response("Unauthorized", { status: 401 });
  }

  const ownerMembership = ctx.tenantMemberships.find((tm) =>
    OWNER_PORTAL_MEMBERSHIP_ROLES.includes(tm.membershipRole)
  );
  if (!ownerMembership && !ctx.isPlatformAdmin) {
    return new Response("Forbidden", { status: 403 });
  }

  const tenantId = ownerMembership?.tenantId ?? ctx.tenantMemberships[0]?.tenantId;
  if (!tenantId) {
    return new Response("No tenant context", { status: 403 });
  }

  const channel = `owner:${tenantId}`;
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      // Send initial unread count
      try {
        const unreadCount = await prisma.notification.count({
          where: {
            tenantId,
            userId: ctx.userId,
            readAt: null,
            dismissedAt: null,
          },
        });
        const msg = formatSSEMessage({ type: "unread_count", data: { unreadCount } });
        controller.enqueue(encoder.encode(msg));
      } catch {
        // swallow
      }

      const unsubscribe = subscribe(channel, controller);

      const hbInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(formatHeartbeat()));
        } catch {
          clearInterval(hbInterval);
        }
      }, 30_000);

      req.signal.addEventListener("abort", () => {
        clearInterval(hbInterval);
        unsubscribe();
        try { controller.close(); } catch { /* already closed */ }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
