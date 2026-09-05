import assert from "node:assert/strict";
import test from "node:test";

import {
  annotationHistoryShortcut,
  completeHistoryStep,
  emptyAnnotationHistory,
  historyEntry,
  recordAnnotationHistory,
} from "./annotation-history.ts";

test("Ctrl/Cmd+Z and Ctrl/Cmd+Y resolve to annotation history actions", () => {
  assert.equal(annotationHistoryShortcut({ key: "z", ctrlKey: true }), "undo");
  assert.equal(annotationHistoryShortcut({ key: "Z", metaKey: true }), "undo");
  assert.equal(
    annotationHistoryShortcut({ key: "z", ctrlKey: true, shiftKey: true }),
    "redo",
  );
  assert.equal(annotationHistoryShortcut({ key: "y", ctrlKey: true }), "redo");
  assert.equal(annotationHistoryShortcut({ key: "y", metaKey: true }), "redo");
  assert.equal(annotationHistoryShortcut({ key: "z" }), null);
  assert.equal(
    annotationHistoryShortcut({ key: "z", ctrlKey: true, altKey: true }),
    null,
  );
});

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
