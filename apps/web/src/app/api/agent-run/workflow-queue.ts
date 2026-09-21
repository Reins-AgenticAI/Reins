export class WorkflowQueueFullError extends Error {}

type QueueOptions = { maxPending: number };

export function createWorkflowQueue({ maxPending }: QueueOptions) {
  let active = false;
  const pending: (() => void)[] = [];

  async function run<T>(work: () => Promise<T>) {
    if (active && pending.length >= maxPending) throw new WorkflowQueueFullError();
    if (active) await new Promise<void>((resolve) => pending.push(resolve));
    active = true;
    try {
      return await work();
    } finally {
      const next = pending.shift();
      if (next) next();
      else active = false;
    }
  }

  return { run };
}
