import assert from "node:assert/strict";
import test from "node:test";
import { eraseAtPoint } from "./annotation-eraser.ts";

const stroke = [
  { x: 0, y: 0.5 },
  { x: 1, y: 0.5 },
];
test("cuts the middle of a sparse stroke without removing its ends", () => {
  const pieces = eraseAtPoint(stroke, { x: 0.5, y: 0.5 }, 10, 100, 200);
  assert.deepEqual(pieces, [
    [
      { x: 0, y: 0.5 },
      { x: 0.4, y: 0.5 },
    ],
    [
      { x: 0.6, y: 0.5 },
      { x: 1, y: 0.5 },
    ],
  ]);
});
test("leaves strokes outside the eraser untouched", () => {
  assert.deepEqual(eraseAtPoint(stroke, { x: 0.5, y: 0 }, 10, 100, 200), [
    stroke,
  ]);
});
test("removes a stroke completely covered by the eraser", () => {
  assert.deepEqual(eraseAtPoint(stroke, { x: 0.5, y: 0.5 }, 60, 100, 200), []);
});
test("uses page pixels so the eraser stays circular on portrait pages", () => {
  const vertical = [
    { x: 0.5, y: 0 },
    { x: 0.5, y: 1 },
  ];
  const pieces = eraseAtPoint(vertical, { x: 0.5, y: 0.5 }, 10, 100, 200);
  assert.equal(pieces[0].at(-1).y, 0.45);
  assert.equal(pieces[1][0].y, 0.55);
});
test("repeated wiping never joins across an erased gap", () => {
  let pieces = eraseAtPoint(stroke, { x: 0.5, y: 0.5 }, 10, 100, 200);
  pieces = pieces.flatMap((points) =>
    eraseAtPoint(points, { x: 0.6, y: 0.5 }, 10, 100, 200),
  );
  assert.equal(pieces.length, 2);
  assert.equal(pieces[0].at(-1).x, 0.4);
  assert.ok(Math.abs(pieces[1][0].x - 0.7) < 1e-10);
});
