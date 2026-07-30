import { afterEach, describe, expect, it, vi } from "vitest";
import { runDurableEventLoop } from "../../apps/agent/src/durableEventLoop";
import { runOutboxWorker } from "../../apps/agent/src/outboxWorker";

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("durable event loop recovery", () => {
  it("retains its first bootstrap baseline when checkpoint persistence retries", async () => {
    vi.useFakeTimers();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const controller = new AbortController();
    const events = vi.fn().mockResolvedValue([{ seq: 42 }]);
    const dispatchPending = vi.fn().mockImplementation((sequence: number) => {
      controller.abort();
      return Promise.resolve(sequence);
    });
    const saveCheckpoint = vi
      .fn()
      .mockRejectedValueOnce(new Error("temporarily unavailable"))
      .mockResolvedValue(42);
    const state = {
      loadCheckpoint: vi.fn().mockResolvedValue(null),
      saveCheckpoint,
    };

    const loop = runDurableEventLoop({ events, dispatchPending }, state, {
      pollIntervalMs: 10,
      maxBackoffMs: 100,
      signal: controller.signal,
    });
    await vi.advanceTimersByTimeAsync(10);
    await loop;

    expect(events).toHaveBeenCalledTimes(1);
    expect(saveCheckpoint).toHaveBeenNthCalledWith(1, 42);
    expect(saveCheckpoint).toHaveBeenNthCalledWith(2, 42);
    expect(dispatchPending).toHaveBeenCalledWith(42);
  });
});

describe("outbox worker recovery", () => {
  it("retries only the acknowledgement after a provider send succeeds", async () => {
    vi.useFakeTimers();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const controller = new AbortController();
    const sendMessage = vi.fn().mockResolvedValue({ id: "provider-message" });
    const delivery = {
      _id: "delivery-id",
      attempts: 1,
      channel: "telegram",
      conversationId: "private-conversation",
      payload: { text: "exercise inject" },
    };
    const markDeliverySent = vi
      .fn()
      .mockRejectedValueOnce(new Error("temporarily unavailable"))
      .mockImplementationOnce(() => {
        controller.abort();
        return Promise.resolve();
      });
    const state = {
      recoverStaleDeliveries: vi.fn().mockResolvedValue(undefined),
      claimNextDelivery: vi.fn().mockResolvedValue(delivery),
      markDeliverySent,
      markDeliveryFailed: vi.fn(),
    };

    const worker = runOutboxWorker({
      client: { sendMessage },
      state,
      signal: controller.signal,
      maxAttempts: 3,
    });
    await vi.advanceTimersByTimeAsync(500);
    await worker;

    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(markDeliverySent).toHaveBeenCalledTimes(2);
    expect(state.markDeliveryFailed).not.toHaveBeenCalled();
  });

  it("survives a transient stale-recovery failure", async () => {
    vi.useFakeTimers();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const controller = new AbortController();
    const recoverStaleDeliveries = vi
      .fn()
      .mockRejectedValueOnce(new Error("temporarily unavailable"))
      .mockResolvedValue(undefined);
    const claimNextDelivery = vi.fn().mockImplementation(() => {
      controller.abort();
      return Promise.resolve(null);
    });

    const worker = runOutboxWorker({
      client: { sendMessage: vi.fn() },
      state: {
        recoverStaleDeliveries,
        claimNextDelivery,
        markDeliverySent: vi.fn(),
        markDeliveryFailed: vi.fn(),
      },
      signal: controller.signal,
      maxAttempts: 3,
    });
    await vi.advanceTimersByTimeAsync(500);
    await worker;

    expect(recoverStaleDeliveries).toHaveBeenCalledTimes(2);
    expect(claimNextDelivery).toHaveBeenCalledTimes(1);
  });
});
