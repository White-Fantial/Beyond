import { type NextRequest } from "next/server";
import {
  subscribe,
  formatSSEMessage,
  formatHeartbeat,
} from "@/lib/sse/stream-manager";
import {
  getStoreBySlugForCustomer,
  getGuestOrderStatus,
} from "@/services/customer-menu.service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/sse/store/[storeSlug]/orders/[orderId]
 *
 * Public (no auth) SSE stream for the storefront confirmation page.
 * Streams order status updates until COMPLETED/CANCELLED/FAILED.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ storeSlug: string; orderId: string }> }
) {
  const { storeSlug, orderId } = await params;

  const store = await getStoreBySlugForCustomer(storeSlug);
  if (!store) {
    return new Response("Store not found", { status: 404 });
  }

  const channel = `order:${orderId}`;
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      // Send initial status
      try {
        const status = await getGuestOrderStatus(store.id, orderId);
        if (!status) {
          controller.close();
          return;
        }
        const msg = formatSSEMessage({ type: "order_status", data: status });
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
