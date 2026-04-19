import { type NextRequest } from "next/server";
import { getCurrentUserAuthContext } from "@/lib/auth/context";
import {
  subscribe,
  formatSSEMessage,
  formatHeartbeat,
} from "@/lib/sse/stream-manager";
import { listLiveOrders } from "@/services/backoffice/backoffice-orders.service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/sse/store/[storeId]/orders
 *
 * SSE stream for the backoffice Kanban board.
 * Sends the current live order list immediately, then a heartbeat every 30s.
 * Backoffice polls this or falls back to 15s setInterval if SSE is unavailable.
 *
 * Authentication: requires store membership.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { storeId: string } }
) {
  const { storeId } = params;
  const ctx = await getCurrentUserAuthContext();
  if (!ctx) {
    return new Response("Unauthorized", { status: 401 });
  }

  const hasMembership =
    ctx.isPlatformAdmin ||
    ctx.storeMemberships.some((m) => m.storeId === storeId);
  if (!hasMembership) {
    return new Response("Forbidden", { status: 403 });
  }

  const channel = `store:${storeId}`;
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      // Send initial snapshot
      try {
        const data = await listLiveOrders(storeId);
        const msg = formatSSEMessage({ type: "orders_snapshot", data });
        controller.enqueue(encoder.encode(msg));
      } catch {
        // swallow initial fetch errors
      }

      // Register for push broadcasts
      const unsubscribe = subscribe(channel, controller);

      // Heartbeat every 30s to keep the connection alive through proxies
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
    cancel() {
      // ReadableStream cancel — cleanup handled by abort listener
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
