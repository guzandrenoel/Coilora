import type { AnnotationHistoryEntry } from "@/lib/api/annotation-target-client";

export async function replayAnnotationHistory(
  entry: AnnotationHistoryEntry,
  direction: "undo" | "redo",
  apply: (
    change: AnnotationHistoryEntry,
    direction: "undo" | "redo",
  ) => Promise<AnnotationHistoryEntry>,
) {
  const entries = entry.changes ?? [entry];
  const results = [...entries];
  const indices = entries.map((_, index) => index);
  if (direction === "undo") indices.reverse();
  const completed: number[] = [];
  try {
    for (const index of indices) {
      results[index] = await apply(entries[index], direction);
      completed.push(index);
    }
  } catch (error) {
    const failures: unknown[] = [];
    for (const index of completed.reverse()) {
      try {
        await apply(results[index], direction === "undo" ? "redo" : "undo");
      } catch (rollbackError) {
        failures.push(rollbackError);
      }
    }
    if (failures.length)
      throw new AggregateError(
        [error, ...failures],
        "The history change only partly saved. Reload the notebook to sync before editing again.",
      );
    throw error;
  }
  return entry.changes ? { ...entry, changes: results } : results[0];
}
