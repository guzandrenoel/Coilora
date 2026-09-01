import assert from "node:assert/strict";
import test from "node:test";

import {
  getNormalizedPoint,
  pointsToSvgPath,
  shouldAppendPoint,
} from "./annotation-geometry.ts";

test("pointer coordinates are normalized and clamped to the page", () => {
  const rectangle = { left: 100, top: 50, width: 400, height: 800 };
  assert.deepEqual(getNormalizedPoint(300, 450, rectangle), {
    x: 0.5,
    y: 0.5,
  });
  assert.deepEqual(getNormalizedPoint(0, 1000, rectangle), {
    x: 0,
    y: 1,
  });
});

test("invalid page dimensions produce a safe origin", () => {
  assert.deepEqual(
    getNormalizedPoint(20, 30, { left: 0, top: 0, width: 0, height: 50 }),
    { x: 0, y: 0 },
  );
});

test("nearby pointer samples are filtered without dropping real movement", () => {
  const points = [{ x: 0.25, y: 0.25 }];
  assert.equal(shouldAppendPoint(points, { x: 0.2501, y: 0.2501 }), false);
  assert.equal(shouldAppendPoint(points, { x: 0.3, y: 0.3 }), true);
});

test("normalized points create an SVG path", () => {
  assert.equal(
    pointsToSvgPath([
      { x: 0, y: 0 },
      { x: 0.5, y: 1 },
    ]),
    "M 0 0 L 0.5 1",
  );
});
