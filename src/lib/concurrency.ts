/**
 * Tiny per-instance concurrency limiter. Caps how many expensive operations
 * (e.g. Piston executor calls) run at once so a burst can't exhaust the job
 * pool or our socket budget. Excess callers queue and resume FIFO.
 *
 * Per-instance only — on multi-instance deployments this bounds each instance,
 * which combined with Piston's own PISTON_MAX_CONCURRENT_JOBS is sufficient.
 */
export class Semaphore {
  private inFlight = 0;
  private readonly waiters: Array<() => void> = [];

  constructor(private readonly max: number) {}

  async acquire(): Promise<void> {
    if (this.inFlight < this.max) {
      this.inFlight++;
      return;
    }
    await new Promise<void>((resolve) => this.waiters.push(resolve));
    this.inFlight++;
  }

  release(): void {
    this.inFlight--;
    this.waiters.shift()?.();
  }

  /** Run `fn` while holding a slot. */
  async run<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }
}
