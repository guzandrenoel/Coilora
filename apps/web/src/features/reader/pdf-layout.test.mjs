import assert from "node:assert/strict";
import test from "node:test";

import { getPageScale, getThumbnailRange } from "./pdf-layout.ts";

test("fit page contains a portrait page within both padded dimensions", () => {
  const scale = getPageScale("page", 600, 800, 1200, 700);
  assert.equal(scale, 652 / 800);
  assert.ok(600 * scale <= 1152);
  assert.ok(800 * scale <= 652);
});

test("fit page contains a landscape page in a narrow viewport", () => {
  assert.equal(getPageScale("page", 800, 600, 390, 700), 342 / 800);
});

test("fit width ignores available height", () => {
  assert.equal(getPageScale("fit", 600, 800, 1200, 300), 1152 / 600);
});

test("opening the sidebar reduces fit scale only when width is limiting", () => {
  assert.ok(
    getPageScale("page", 800, 600, 816, 1200) <
      getPageScale("page", 800, 600, 1000, 1200),
  );
  assert.equal(
    getPageScale("page", 600, 800, 1200, 600),
    getPageScale("page", 600, 800, 1016, 600),
  );
});

test("fixed zoom ignores viewport resizing", () => {
  assert.equal(getPageScale(1.5, 600, 800, 390, 700), 1.5);
  assert.equal(getPageScale(1.5, 600, 800, 1400, 900), 1.5);
});

test("fit modes cap enlargement and stay positive in tiny viewports", () => {
  assert.equal(getPageScale("page", 100, 100, 3000, 3000), 3);
  assert.ok(getPageScale("page", 600, 800, 40, 40) > 0);
});

test("invalid PDF dimensions and zoom levels are rejected", () => {
  for (const size of [0, -1, NaN, Infinity]) {
    assert.throws(() => getPageScale("page", size, 800, 1200, 700));
    assert.throws(() => getPageScale("page", 600, size, 1200, 700));
  }
  for (const zoom of [0, 4, NaN, Infinity]) {
    assert.throws(() => getPageScale(zoom, 600, 800, 1200, 700));
  }
});

test("a large PDF only mounts thumbnails near the visible rows", () => {
  assert.deepEqual(getThumbnailRange(0, 612, 5000), { start: 0, end: 5 });
  assert.deepEqual(getThumbnailRange(2040, 612, 5000), { start: 8, end: 15 });
});

test("thumbnail ranges stay within the document at either end", () => {
  assert.deepEqual(getThumbnailRange(0, 612, 1), { start: 0, end: 1 });
  assert.deepEqual(getThumbnailRange(19 * 204, 612, 20), {
    start: 17,
    end: 20,
  });
  assert.deepEqual(getThumbnailRange(0, 612, 0), { start: 0, end: 0 });
});
