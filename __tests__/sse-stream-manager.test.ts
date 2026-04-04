import { describe, it, expect, beforeEach } from "vitest";
import {
  subscribe,
  broadcast,
  subscriberCount,
  formatSSEMessage,
  formatHeartbeat,
} from "@/lib/sse/stream-manager";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeController() {
  const enqueued: Uint8Array[] = [];
  let closed = false;

  const controller = {
    enqueue: (chunk: Uint8Array) => {
      if (closed) throw new Error("Controller is closed");
      enqueued.push(chunk);
    },
    close: () => { closed = true; },
    enqueued,
    get closed() { return closed; },
  };

  return controller as unknown as ReadableStreamDefaultController<Uint8Array>;
}

function decodeParts(controller: ReturnType<typeof makeController>): string[] {
  const raw = controller as unknown as { enqueued: Uint8Array[] };
  const decoder = new TextDecoder();
  return raw.enqueued.map((b) => decoder.decode(b));
}

// ─── formatSSEMessage ─────────────────────────────────────────────────────────

describe("formatSSEMessage", () => {
  it("produces a correctly formatted SSE event string", () => {
    const result = formatSSEMessage({ type: "test_event", data: { foo: "bar" } });
    expect(result).toContain('event: test_event\n');
    expect(result).toContain('data: {"foo":"bar"}\n');
    expect(result.endsWith("\n\n")).toBe(true);
  });

  it("serialises complex data objects", () => {
    const data = { count: 5, items: [1, 2, 3] };
    const result = formatSSEMessage({ type: "complex", data });
    expect(result).toContain(JSON.stringify(data));
  });
});

// ─── formatHeartbeat ─────────────────────────────────────────────────────────

describe("formatHeartbeat", () => {
  it("returns a SSE comment line ending with double newline", () => {
    const result = formatHeartbeat();
    expect(result).toBe(": heartbeat\n\n");
  });
});

// ─── subscribe & subscriberCount ─────────────────────────────────────────────

describe("subscribe", () => {
  // Each test uses unique channel names to avoid state leakage between tests
  let channelIdx = 0;
  function ch(): string { return `test_channel_${channelIdx++}`; }

  it("increments subscriberCount when a controller is added", () => {
    const channel = ch();
    expect(subscriberCount(channel)).toBe(0);
    const unsub = subscribe(channel, makeController());
    expect(subscriberCount(channel)).toBe(1);
    unsub();
  });

  it("decrements subscriberCount when unsubscribed", () => {
    const channel = ch();
    const unsub = subscribe(channel, makeController());
    expect(subscriberCount(channel)).toBe(1);
    unsub();
    expect(subscriberCount(channel)).toBe(0);
  });

  it("supports multiple subscribers on the same channel", () => {
    const channel = ch();
    const unsub1 = subscribe(channel, makeController());
    const unsub2 = subscribe(channel, makeController());
    expect(subscriberCount(channel)).toBe(2);
    unsub1();
    unsub2();
  });

  it("returns a no-op unsubscribe when called twice", () => {
    const channel = ch();
    const unsub = subscribe(channel, makeController());
    unsub();
    expect(() => unsub()).not.toThrow();
  });
});

// ─── broadcast ────────────────────────────────────────────────────────────────

describe("broadcast", () => {
  let channelIdx = 0;
  function ch(): string { return `broadcast_channel_${channelIdx++}`; }

  it("sends the formatted SSE message to all subscribers", () => {
    const channel = ch();
    const ctrl1 = makeController();
    const ctrl2 = makeController();
    const unsub1 = subscribe(channel, ctrl1);
    const unsub2 = subscribe(channel, ctrl2);

    broadcast(channel, { type: "test", data: { value: 1 } });

    const msgs1 = decodeParts(ctrl1);
    const msgs2 = decodeParts(ctrl2);
    expect(msgs1[0]).toContain("test");
    expect(msgs2[0]).toContain("test");

    unsub1();
    unsub2();
  });

  it("does nothing when there are no subscribers", () => {
    const channel = ch();
    expect(() => broadcast(channel, { type: "noop", data: {} })).not.toThrow();
  });

  it("removes dead controllers silently", () => {
    const channel = ch();
    const ctrl = makeController();
    // Force the controller to be "dead" by closing it
    (ctrl as unknown as { enqueued: unknown[] }).enqueued; // access to check it exists
    const unsub = subscribe(channel, ctrl);

    // Manually make enqueue throw
    const raw = ctrl as unknown as { enqueue: (c: Uint8Array) => void };
    raw.enqueue = () => { throw new Error("Dead controller"); };

    // Should not throw even though the controller is dead
    expect(() => broadcast(channel, { type: "test", data: {} })).not.toThrow();

    unsub();
  });

  it("sends JSON-encoded data", () => {
    const channel = ch();
    const ctrl = makeController();
    const unsub = subscribe(channel, ctrl);
    const payload = { orderId: "abc-123", status: "READY" };

    broadcast(channel, { type: "order_status", data: payload });

    const msgs = decodeParts(ctrl);
    expect(msgs[0]).toContain(JSON.stringify(payload));
    unsub();
  });
});
