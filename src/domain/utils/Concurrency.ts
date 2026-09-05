/**
 * Runs `work` over every item with at most `limit` in flight.
 *
 * Results are positional, and a rejection is returned rather than thrown: one
 * item that fails must not take the whole batch down with it — the same reason
 * `MarketData` uses `allSettled`.
 *
 * `limit` is deliberately required. What a safe number of simultaneous requests
 * is depends entirely on who is being called — a community mirror published as a
 * courtesy is not a dozen unrelated APIs — so a default here would be one
 * caller's budget quietly spent by another.
 */
export async function mapWithConcurrency<T, R>(
  items: T[],
  work: (item: T) => Promise<R>,
  limit: number
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let next = 0;

  async function worker(): Promise<void> {
    while (next < items.length) {
      const index = next++;
      try {
        results[index] = { status: 'fulfilled', value: await work(items[index]) };
      } catch (reason) {
        results[index] = { status: 'rejected', reason };
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}
