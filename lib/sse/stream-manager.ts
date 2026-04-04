/**
 * SSE Stream Manager
 *
 * In-process registry of open SSE connections, keyed by channel.
 * Channels are strings like:
 *   "store:<storeId>" — backoffice order board
 *   "owner:<tenantId>" — owner notification bell
 *   "order:<orderId>" — storefront confirmation page
 *
 * NOTE: This works correctly in single-process deployments.
 * For multi-process or serverless deployments, replace with Redis pub/sub.
 */

export type SSEController = ReadableStreamDefaultController<Uint8Array>;

export interface SSEEvent {
  type: string;
  data: unknown;
}

const channels = new Map<string, Set<SSEController>>();

/**
 * Register a controller to a channel. Returns an unsubscribe function.
 */
export function subscribe(channel: string, controller: SSEController): () => void {
  if (!channels.has(channel)) {
    channels.set(channel, new Set());
  }
  channels.get(channel)!.add(controller);

  return () => {
    const set = channels.get(channel);
    if (set) {
      set.delete(controller);
      if (set.size === 0) channels.delete(channel);
    }
  };
}

/**
 * Broadcast an event to all subscribers on a channel.
 * Silently removes dead controllers.
 */
export function broadcast(channel: string, event: SSEEvent): void {
  const set = channels.get(channel);
  if (!set || set.size === 0) return;

  const encoded = formatSSEMessage(event);
  const encoder = new TextEncoder();
  const bytes = encoder.encode(encoded);

  const dead: SSEController[] = [];
  for (const controller of set) {
    try {
      controller.enqueue(bytes);
    } catch {
      dead.push(controller);
    }
  }
  for (const c of dead) set.delete(c);
  if (set.size === 0) channels.delete(channel);
}

/**
 * Returns the number of active subscribers on a channel.
 */
export function subscriberCount(channel: string): number {
  return channels.get(channel)?.size ?? 0;
}

/**
 * Format an SSE message string.
 * Result: "event: <type>\ndata: <JSON>\n\n"
 */
export function formatSSEMessage(event: SSEEvent): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`;
}

/**
 * Format a heartbeat comment (no event dispatched on client).
 */
export function formatHeartbeat(): string {
  return ": heartbeat\n\n";
}
