import assert from "node:assert/strict";
import test from "node:test";

import {
  completeHistoryStep,
  emptyAnnotationHistory,
  historyEntry,
  recordAnnotationHistory,
} from "./annotation-history.ts";

const entry = (id) => ({
  target: {
    kind: "notebook-page",
    key: "note:page",
    notebookId: "notebook",
    pageId: "page",
  },
  before: null,
  after: { id },
});

test("new edits clear redo history", () => {
  const first = entry("first");
  const undone = completeHistoryStep(
    recordAnnotationHistory(emptyAnnotationHistory, first),
    "undo",
    first,
  );
  const next = recordAnnotationHistory(undone, entry("next"));
  assert.equal(next.past.length, 1);
  assert.equal(next.past[0].after.id, "next");
  assert.equal(next.future.length, 0);
});

test("undo and redo move the newest edit between stacks", () => {
  const first = entry("first");
  const second = entry("second");
  const state = recordAnnotationHistory(
    recordAnnotationHistory(emptyAnnotationHistory, first),
    second,
  );
  assert.equal(historyEntry(state, "undo"), second);

  const undone = completeHistoryStep(state, "undo", second);
  assert.equal(historyEntry(undone, "undo"), first);
  assert.equal(historyEntry(undone, "redo"), second);

  const redone = completeHistoryStep(undone, "redo", second);
  assert.deepEqual(redone, state);
});

test("history retains only the latest one hundred edits", () => {
  let state = emptyAnnotationHistory;
  for (let index = 0; index < 105; index += 1) {
    state = recordAnnotationHistory(state, entry(String(index)));
  }
  assert.equal(state.past.length, 100);
  assert.equal(state.past[0].after.id, "5");
  assert.equal(state.past.at(-1).after.id, "104");
});
