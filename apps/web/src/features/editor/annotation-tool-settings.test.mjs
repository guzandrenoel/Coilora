import assert from "node:assert/strict";
import test from "node:test";
import {
  defaultAnnotationToolPreferences,
  parseAnnotationToolPreferences,
  selectDrawingColor,
} from "./annotation-tool-settings.ts";

test("annotation tools have separate pen, highlighter and text defaults", () => {
  const settings = defaultAnnotationToolPreferences();

  assert.equal(settings.ink.opacity, 1);
  assert.equal(settings.highlight.opacity, 0.35);
  assert.notEqual(settings.ink.color, settings.highlight.color);
  assert.equal(settings.text.width, 0.025);
  assert.equal(settings.text.color, "#173f5f");
});

test("saved annotation settings are validated before use", () => {
  const settings = parseAnnotationToolPreferences(
    JSON.stringify({
      ink: {
        color: "#ABCDEF",
        width: 0.007,
        opacity: 0.8,
        recentColors: ["#112233", "invalid"],
      },
      highlight: { width: 4, opacity: -1 },
    }),
  );

  assert.deepEqual(settings.ink, {
    color: "#abcdef",
    width: 0.007,
    opacity: 0.8,
    recentColors: ["#abcdef", "#112233", "#173f5f"],
  });
  assert.equal(settings.highlight.width, 0.03);
  assert.equal(settings.highlight.opacity, 0.35);
  assert.equal(settings.text.width, 0.025);
});

test("selecting a color promotes it into the quick palette", () => {
  const style = defaultAnnotationToolPreferences().ink;
  const selected = selectDrawingColor(style, "#1687EA");

  assert.equal(selected.color, "#1687ea");
  assert.deepEqual(selected.recentColors, ["#1687ea", "#173f5f", "#111111"]);
});
