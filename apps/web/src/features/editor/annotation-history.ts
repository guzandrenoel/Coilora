import type { AnnotationHistoryEntry } from "@/lib/api/annotation-target-client";

export type AnnotationHistoryState = {
  past: AnnotationHistoryEntry[];
  future: AnnotationHistoryEntry[];
};

export const emptyAnnotationHistory: AnnotationHistoryState = {
  past: [],
  future: [],
};

const historyLimit = 100;

export function recordAnnotationHistory(
  state: AnnotationHistoryState,
  entry: AnnotationHistoryEntry,
): AnnotationHistoryState {
  return {
    past: [...state.past, entry].slice(-historyLimit),
    future: [],
  };
}

export function historyEntry(
  state: AnnotationHistoryState,
  direction: "undo" | "redo",
) {
  return direction === "undo" ? state.past.at(-1) : state.future.at(-1);
}

export function completeHistoryStep(
  state: AnnotationHistoryState,
  direction: "undo" | "redo",
  entry: AnnotationHistoryEntry,
): AnnotationHistoryState {
  return direction === "undo"
    ? {
        past: state.past.slice(0, -1),
        future: [...state.future, entry],
      }
    : {
        past: [...state.past, entry],
        future: state.future.slice(0, -1),
      };
}
