import assert from "node:assert/strict";
import test from "node:test";
import {
  defaultTextFormat,
  parseTextFormat,
  textFontFamilies,
  textFontStack,
} from "./text-format.ts";

test("text formatting offers distinct font families", () => {
  assert.deepEqual(textFontFamilies, [
    "modern",
    "classic",
    "rounded",
    "typewriter",
    "handwritten",
  ]);
  assert.notEqual(textFontStack("modern"), textFontStack("classic"));
  assert.notEqual(textFontStack("typewriter"), textFontStack("handwritten"));
});

test("saved text formatting is validated before use", () => {
  assert.deepEqual(
    parseTextFormat(
      JSON.stringify({
        fontFamily: "rounded",
        bold: true,
        italic: true,
        textAlign: "center",
      }),
    ),
    {
      fontFamily: "rounded",
      bold: true,
      italic: true,
      textAlign: "center",
    },
  );

  assert.deepEqual(
    parseTextFormat(
      JSON.stringify({
        fontFamily: "missing",
        bold: "yes",
        textAlign: "justify",
      }),
    ),
    defaultTextFormat,
  );
});
