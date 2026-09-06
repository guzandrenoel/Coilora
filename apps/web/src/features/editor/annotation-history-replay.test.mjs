import assert from "node:assert/strict";
import test from "node:test";
import { replayAnnotationHistory } from "./annotation-history-replay.ts";

const first = {
  before: { id: "original" },
  after: { id: "original", revision: 2 },
};
const second = { before: null, after: { id: "fragment" } };
const gesture = { changes: [first, second] };

test("undo replays every eraser fragment in reverse order, redo in original order", async () => {
  const calls = [];
  const apply = async (change, direction) => {
    calls.push([change, direction]);
    return change;
  };
  const undone = await replayAnnotationHistory(gesture, "undo", apply);
  assert.deepEqual(calls, [
    [second, "undo"],
    [first, "undo"],
  ]);
  calls.length = 0;
  await replayAnnotationHistory(undone, "redo", apply);
  assert.deepEqual(calls, [
    [first, "redo"],
    [second, "redo"],
  ]);
});

test("a failed grouped undo rolls back changes that already succeeded", async () => {
  const calls = [];
  await assert.rejects(
    replayAnnotationHistory(gesture, "undo", async (change, direction) => {
      calls.push([change, direction]);
      if (change === first && direction === "undo") throw new Error("offline");
      return change;
    }),
    /offline/,
  );
  assert.deepEqual(calls, [
    [second, "undo"],
    [first, "undo"],
    [second, "redo"],
  ]);
});
