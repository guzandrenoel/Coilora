import assert from "node:assert/strict";
import test from "node:test";

import { visibleNotebooks } from "./library-view.ts";

import { coverColors, isCoverColor } from "../../lib/api/types.ts";

const courses = [
  { id: "course-a", name: "Human anatomy" },
  { id: "course-b", name: "Parasitology" },
];
const notebooks = [
  {
    id: "a",
    title: "Cardiovascular system",
    description: "Heart and vessels",
    course_id: "course-a",
    updated_at: "2026-08-01T00:00:00Z",
  },
  {
    id: "b",
    title: "Lecture review",
    description: null,
    course_id: "course-b",
    updated_at: "2026-08-03T00:00:00Z",
  },
  {
    id: "c",
    title: "Reading notes",
    description: null,
    course_id: null,
    updated_at: "2026-08-02T00:00:00Z",
  },
];
const ids = (items) => items.map((item) => item.id);

test("notebooks sort by most recently updated without changing source order", () => {
  assert.deepEqual(
    ids(visibleNotebooks(notebooks, courses, "", "", "updated")),
    ["b", "c", "a"],
  );
  assert.deepEqual(ids(notebooks), ["a", "b", "c"]);
});

test("title sort is alphabetical", () => {
  assert.deepEqual(ids(visibleNotebooks(notebooks, courses, "", "", "title")), [
    "a",
    "b",
    "c",
  ]);
});

test("search is trimmed and case-insensitive", () => {
  assert.deepEqual(
    ids(visibleNotebooks(notebooks, courses, " CARDIOvascular ", "", "title")),
    ["a"],
  );
});

test("search includes course names and descriptions", () => {
  assert.deepEqual(
    ids(visibleNotebooks(notebooks, courses, "anatomy", "", "title")),
    ["a"],
  );
  assert.deepEqual(
    ids(visibleNotebooks(notebooks, courses, "vessels", "", "title")),
    ["a"],
  );
});

test("course filtering combines with search", () => {
  assert.deepEqual(
    ids(visibleNotebooks(notebooks, courses, "", "course-b", "title")),
    ["b"],
  );
  assert.deepEqual(
    visibleNotebooks(notebooks, courses, "Cardio", "course-b", "title"),
    [],
  );
});

test("No course includes only unassigned notebooks", () => {
  assert.deepEqual(
    ids(visibleNotebooks(notebooks, courses, "", "uncategorized", "title")),
    ["c"],
  );
});

test("empty collections and no search matches return an empty result", () => {
  assert.deepEqual(visibleNotebooks([], [], "", "", "updated"), []);
  assert.deepEqual(
    visibleNotebooks(notebooks, courses, "missing", "", "updated"),
    [],
  );
});

test("only supported saved cover colors are accepted", () => {
  assert.equal(coverColors.length, 7);
  assert.equal(isCoverColor("yellow"), true);
  for (const color of coverColors) assert.equal(isCoverColor(color), true);
  for (const color of [null, undefined, "", "brown", "SAGE", "#123456", 1])
    assert.equal(isCoverColor(color), false);
});

test("tied dates sort consistently and missing course names do not break search", () => {
  const tied = notebooks.map((notebook) => ({
    ...notebook,
    updated_at: "invalid",
  }));
  assert.deepEqual(ids(visibleNotebooks(tied, [], "", "", "updated")), [
    "a",
    "b",
    "c",
  ]);
});
