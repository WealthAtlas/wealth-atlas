/**
 * For each schedule entry, persists all pending occurrences then advances lastGeneratedDate.
 * Used by SIP and EMI auto-generation on startup.
 */
export async function processSchedules<TSchedule, TOccurrence extends { date: Date }>(
  entries: { schedule: TSchedule; occurrences: TOccurrence[] }[],
  persistOccurrence: (occurrence: TOccurrence) => Promise<unknown>,
  updateSchedule: (schedule: TSchedule, lastGeneratedDate: Date) => Promise<unknown>
): Promise<void> {
  for (const { schedule, occurrences } of entries) {
    if (occurrences.length === 0) continue;
    for (const occurrence of occurrences) {
      await persistOccurrence(occurrence);
    }
    await updateSchedule(schedule, occurrences[occurrences.length - 1].date);
  }
}
