/**
 * Tiny server-side timing helper for diagnosing request latency.
 *
 * TEMPORARY — added to pin down where navigation time goes (raw DB round-trip
 * vs. query work vs. render). Output shows up in `vercel logs`. Safe to delete
 * once the latency source is confirmed.
 */
export async function timed<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const start = performance.now();
  try {
    return await fn();
  } finally {
    const ms = Math.round(performance.now() - start);
    console.log(`[timing] ${label}: ${ms}ms`);
  }
}

/**
 * Measures the raw DB round-trip with a trivial query. This isolates pure
 * network latency to the database from any query complexity — if this is
 * ~200ms+, the function and DB are in different regions.
 */
export async function pingDb(
  prisma: { $queryRaw: (q: TemplateStringsArray) => Promise<unknown> },
): Promise<void> {
  await timed("db:ping(SELECT 1)", () => prisma.$queryRaw`SELECT 1`);
}
