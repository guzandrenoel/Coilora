import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildTimeline,
  layoutTimeline,
  rowAtOffset,
  timelineWidth,
  visibleRows,
  anchoredScroll,
  clampNotebookZoom,
  scaleNotebookZoom,
  selectionAfterNoteDeletion,
  rememberExpandedDocument,
} from "./notebook-timeline.ts";

const note = (id, position, extra = {}) => ({
  id,
  position,
  title: id,
  paper_style: "blank",
  document_id: null,
  after_document_page_number: null,
  ...extra,
});
const pdf = (id, count, extra = {}) => ({
  id,
  title: id,
  page_count: count,
  source_type: "pdf",
  status: "uploaded",
  created_at: "2026-09-01",
  ...extra,
});
const viewport = { width: 1000, height: 800 };

test("deleting a note selects the next page, then the previous page", () => {
  const rows = buildTimeline([note("a", 1), note("b", 2), note("c", 3)], []);
  assert.equal(selectionAfterNoteDeletion(rows, "a", "note:a")?.key, "note:b");
  assert.equal(selectionAfterNoteDeletion(rows, "b", "note:b")?.key, "note:c");
  assert.equal(selectionAfterNoteDeletion(rows, "c", "note:c")?.key, "note:b");
  assert.equal(selectionAfterNoteDeletion(rows, "a", "note:c")?.key, "note:c");
  assert.equal(
    selectionAfterNoteDeletion(
      buildTimeline([note("a", 1)], []),
      "a",
      "note:a",
    ),
    undefined,
  );
  assert.equal(selectionAfterNoteDeletion([], "missing"), undefined);
});

test("deletion navigation retains PDF pages and document headings", () => {
  const rows = buildTimeline(
    [
      note("first", 1),
      note("inserted", 2, {
        document_id: "pdf",
        after_document_page_number: 1,
      }),
    ],
    [pdf("pdf", 2)],
  );
  assert.equal(
    selectionAfterNoteDeletion(rows, "first", "note:first")?.key,
    "pdf:pdf:1",
  );
  assert.equal(
    selectionAfterNoteDeletion(rows, "inserted", "note:inserted")?.key,
    "pdf:pdf:2",
  );
  assert.equal(
    selectionAfterNoteDeletion(rows, "inserted", "pdf:pdf:1")?.key,
    "pdf:pdf:1",
  );
  const unavailable = buildTimeline(
    [note("first", 1)],
    [pdf("failed", null, { status: "failed" })],
  );
  assert.equal(
    selectionAfterNoteDeletion(unavailable, "first", "note:first")?.key,
    "document:failed",
  );
});

test("notes, PDFs and inserted notes have one stable order", () => {
  const rows = buildTimeline(
    [
      note("second", 2),
      note("first", 1),
      note("before", 3, { document_id: "a", after_document_page_number: 0 }),
      note("after1", 4, { document_id: "a", after_document_page_number: 1 }),
      note("after2", 5, { document_id: "a", after_document_page_number: 2 }),
    ],
    [pdf("b", 1, { created_at: "2026-09-02" }), pdf("a", 2)],
  );
  assert.deepEqual(
    rows.map((row) => row.key),
    [
      "note:first",
      "note:second",
      "document:a",
      "note:before",
      "pdf:a:1",
      "note:after1",
      "pdf:a:2",
      "note:after2",
      "document:b",
      "pdf:b:1",
    ],
  );
});

test("notes are not lost when their source is absent, unavailable, or has unknown length", () => {
  const notes = [
    note("orphan", 1, { document_id: "missing" }),
    note("later", 2, { document_id: "a", after_document_page_number: 5 }),
    note("legacy", 3, { document_id: "b" }),
  ];
  const keys = buildTimeline(notes, [
    pdf("a", null),
    pdf("b", null, { status: "failed" }),
  ]).map((row) => row.key);
  assert.deepEqual(keys, [
    "note:orphan",
    "document:a",
    "pdf:a:1",
    "note:later",
    "document:b",
    "note:legacy",
  ]);
  const resolved = buildTimeline(notes, [
    pdf("a", 8),
    pdf("b", 0, { source_type: "image" }),
  ]).map((row) => row.key);
  assert.equal(resolved[resolved.indexOf("pdf:a:5") + 1], "note:later");
  for (const key of ["note:orphan", "note:later", "note:legacy"])
    assert.equal(resolved.filter((item) => item === key).length, 1);
});

test("5,000-page PDF layout keeps the rendered window small at either end", () => {
  const rows = layoutTimeline(
    buildTimeline([note("a", 0)], [pdf("large", 5000)]),
    {},
    viewport,
    "page",
  );
  assert.equal(rows.length, 5002);
  for (const top of [0, rows[2500].top, rows.at(-1).top]) {
    const range = visibleRows(rows, top, viewport.height);
    assert.ok(range.end - range.start <= 6);
    assert.ok(range.start >= 0 && range.end <= rows.length);
  }
  assert.equal(rowAtOffset(rows, -100), 0);
  assert.equal(rowAtOffset(rows, Infinity), rows.length - 1);
});

test("mixed portrait and landscape pages fit without distorting dimensions", () => {
  const rows = layoutTimeline(
    buildTimeline([], [pdf("a", 2)]),
    { "pdf:a:2": { width: 1000, height: 500 } },
    viewport,
    "width",
  );
  assert.equal(rows[2].width, 952);
  assert.equal(rows[2].paperHeight, 476);
  assert.equal(rows[2].top, rows[1].top + rows[1].height);
  assert.ok(rows[1].paperHeight > rows[2].paperHeight);
});

test("discovering dimensions or page counts above the viewport retains its page anchor", () => {
  const before = layoutTimeline(
    buildTimeline([], [pdf("a", 1), pdf("b", 1)]),
    {},
    viewport,
    "page",
  );
  const after = layoutTimeline(
    buildTimeline([], [pdf("a", 20), pdf("b", 1)]),
    {},
    viewport,
    "width",
  );
  const old = before.find((row) => row.entry.key === "pdf:b:1");
  const next = after.find((row) => row.entry.key === "pdf:b:1");
  assert.equal(
    anchoredScroll(before, after, old.top + old.height / 2),
    next.top + next.height / 2,
  );
});

test("empty notebooks and numeric zoom have safe geometry", () => {
  assert.deepEqual(visibleRows([], 0, 800), { start: 0, end: 0 });
  assert.equal(rowAtOffset([], 100), -1);
  assert.equal(anchoredScroll([], [], 0), 0);
  const [row] = layoutTimeline(
    buildTimeline([note("a", 0)], []),
    {},
    viewport,
    2,
  );
  assert.equal(row.width, 1190);
  assert.equal(row.paperHeight, 1684);
});

test("interactive zoom remains within safe mobile and desktop limits", () => {
  assert.equal(clampNotebookZoom(0.1), 0.25);
  assert.equal(clampNotebookZoom(5), 4);
  assert.equal(scaleNotebookZoom(1, 1.15), 1.15);
  assert.equal(scaleNotebookZoom(0.25, 0.5), 0.25);
  assert.equal(scaleNotebookZoom(4, 2), 4);
});

test("an automatically opened PDF stays open after scrolling to another page", () => {
  const initial = {};
  const opened = rememberExpandedDocument(initial, "document-a");
  assert.deepEqual(opened, { "document-a": true });
  assert.strictEqual(rememberExpandedDocument(opened), opened);
  assert.strictEqual(rememberExpandedDocument(opened, "document-a"), opened);
  assert.deepEqual(
    rememberExpandedDocument({ "document-a": false }, "document-a"),
    { "document-a": false },
  );
});

test("document headings do not cause horizontal overflow in fit modes", () => {
  const entries = buildTimeline([note("a", 0)], [pdf("b", 20)]);
  for (const zoom of ["width", "page"]) {
    assert.equal(
      timelineWidth(
        layoutTimeline(entries, {}, viewport, zoom),
        viewport.width,
      ),
      viewport.width,
    );
  }
  assert.ok(
    timelineWidth(layoutTimeline(entries, {}, viewport, 2), viewport.width) >
      viewport.width,
  );
});
