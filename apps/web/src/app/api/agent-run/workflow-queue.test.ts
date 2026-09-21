import { describe, expect, it } from "vitest";
import { createWorkflowQueue, WorkflowQueueFullError } from "./workflow-queue";

describe("workflow queue", () => {
  it("serializes local-model workflows so a second request starts only after the first finishes", async () => {
    const queue = createWorkflowQueue({ maxPending: 1 });
    const order: string[] = [];
    let release!: () => void;
    const first = queue.run(
      () =>
        new Promise<string>((resolve) => {
          order.push("first-start");
          release = () => {
            order.push("first-end");
            resolve("first");
          };
        }),
    );
    const second = queue.run(async () => {
      order.push("second-start");
      return "second";
    });

    expect(order).toEqual(["first-start"]);
    release();
    await expect(Promise.all([first, second])).resolves.toEqual(["first", "second"]);
    expect(order).toEqual(["first-start", "first-end", "second-start"]);
  });

  it("rejects a third request instead of allowing unbounded local-model queueing", async () => {
    const queue = createWorkflowQueue({ maxPending: 1 });
    let release!: () => void;
    void queue.run(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );
    void queue.run(async () => undefined);

    await expect(queue.run(async () => undefined)).rejects.toBeInstanceOf(WorkflowQueueFullError);
    release();
  });
});
