"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { HighlighterIcon, PenIcon, TextIcon } from "@/components/ui/icons";
import {
  selectDrawingColor,
  type DrawingStyle,
  type DrawingTool,
} from "./annotation-tool-settings";
import { annotationPalette } from "./annotation-colors";
import styles from "./annotation-settings-dock.module.css";
import {
  defaultTextFormat,
  textFontFamilies,
  textFontStack,
  type TextFormat,
} from "./text-format";

const widths: Record<
  DrawingTool,
  { label: string; value: number; sample: number }[]
> = {
  ink: [
    { label: "Thin", value: 0.0025, sample: 1 },
    { label: "Medium", value: 0.004, sample: 3 },
    { label: "Thick", value: 0.007, sample: 5 },
  ],
  highlight: [
    { label: "Thin", value: 0.018, sample: 3 },
    { label: "Medium", value: 0.03, sample: 6 },
    { label: "Thick", value: 0.045, sample: 9 },
  ],
  text: [
    { label: "Small", value: 0.018, sample: 14 },
    { label: "Medium", value: 0.025, sample: 18 },
    { label: "Large", value: 0.035, sample: 22 },
  ],
};

const highlighterOpacities = [
  { label: "Light", value: 0.2 },
  { label: "Medium", value: 0.35 },
  { label: "Bold", value: 0.5 },
];

export function AnnotationSettingsDock({
  tool,
  style,
  sidebarOpen,
  onChange,
  textFormat = defaultTextFormat,
  onTextFormatChange,
}: {
  tool: DrawingTool;
  style: DrawingStyle;
  sidebarOpen: boolean;
  onChange: (style: DrawingStyle) => void;
  textFormat?: TextFormat;
  onTextFormatChange?: (format: TextFormat) => void;
}) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const shellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!paletteOpen) return;

    function close(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !shellRef.current?.contains(event.target)
      ) {
        setPaletteOpen(false);
      }
    }

    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") setPaletteOpen(false);
    }

    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [paletteOpen]);

  function chooseColor(color: string) {
    onChange(selectDrawingColor(style, color));
  }

  return (
    <div
      ref={shellRef}
      className={styles.shell}
      data-sidebar-open={sidebarOpen}
      data-text-settings={tool === "text" || undefined}
    >
      <div
        className={styles.dock}
        data-text-toolbar={tool === "text" || undefined}
        role="group"
        aria-label={`${tool} settings`}
      >
        <div
          className={styles.toolMarker}
          title={
            tool === "ink"
              ? "Pen"
              : tool === "highlight"
                ? "Highlighter"
                : "Text"
          }
        >
          {tool === "ink" ? (
            <PenIcon />
          ) : tool === "highlight" ? (
            <HighlighterIcon />
          ) : (
            <TextIcon />
          )}
        </div>
        <div className={styles.divider} />
        {tool === "text" ? (
          <>
            <button
              type="button"
              className={styles.currentColor}
              style={{ backgroundColor: style.color }}
              aria-label="Choose text color"
              title="Text color"
              aria-expanded={paletteOpen}
              onClick={() => setPaletteOpen((open) => !open)}
            />
            <div
              className={styles.textSize}
              role="group"
              aria-label="Text size"
            >
              <button
                type="button"
                aria-label="Decrease text size"
                onClick={() =>
                  onChange({
                    ...style,
                    width: Math.max(
                      0.01,
                      Math.round((style.width - 0.002) * 1000) / 1000,
                    ),
                  })
                }
              >
                −
              </button>
              <output aria-live="polite">
                {Math.round(style.width * 842)}
              </output>
              <input
                type="range"
                min="10"
                max="72"
                step="1"
                value={Math.round(style.width * 842)}
                aria-label="Text size"
                onChange={(event) =>
                  onChange({
                    ...style,
                    width: Number(event.target.value) / 842,
                  })
                }
              />
              <button
                type="button"
                aria-label="Increase text size"
                onClick={() =>
                  onChange({
                    ...style,
                    width: Math.min(
                      0.0855,
                      Math.round((style.width + 0.002) * 1000) / 1000,
                    ),
                  })
                }
              >
                +
              </button>
            </div>
            <label className={styles.fontPicker}>
              <span className={styles.srOnly}>Font</span>
              <select
                value={textFormat.fontFamily}
                aria-label="Font"
                style={{ fontFamily: textFontStack(textFormat.fontFamily) }}
                onChange={(event) =>
                  onTextFormatChange?.({
                    ...textFormat,
                    fontFamily: event.target.value as TextFormat["fontFamily"],
                  })
                }
              >
                {textFontFamilies.map((font) => (
                  <option
                    key={font}
                    value={font}
                    style={{ fontFamily: textFontStack(font) }}
                  >
                    {font[0].toUpperCase() + font.slice(1)}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className={styles.formatButton}
              aria-label="Bold"
              title="Bold"
              aria-pressed={textFormat.bold}
              onClick={() =>
                onTextFormatChange?.({ ...textFormat, bold: !textFormat.bold })
              }
            >
              <strong>B</strong>
            </button>
            <button
              type="button"
              className={styles.formatButton}
              aria-label="Italic"
              title="Italic"
              aria-pressed={textFormat.italic}
              onClick={() =>
                onTextFormatChange?.({
                  ...textFormat,
                  italic: !textFormat.italic,
                })
              }
            >
              <em>I</em>
            </button>
            <div
              className={styles.alignment}
              role="group"
              aria-label="Text alignment"
            >
              {(["left", "center", "right"] as const).map((alignment) => (
                <button
                  type="button"
                  key={alignment}
                  aria-label={`Align ${alignment}`}
                  title={`Align ${alignment}`}
                  aria-pressed={textFormat.textAlign === alignment}
                  onClick={() =>
                    onTextFormatChange?.({
                      ...textFormat,
                      textAlign: alignment,
                    })
                  }
                >
                  <span data-align={alignment} aria-hidden="true">
                    ≡
                  </span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div
              className={styles.widths}
              role="group"
              aria-label="Stroke thickness"
            >
              {widths[tool].map((option) => (
                <button
                  type="button"
                  key={option.value}
                  aria-label={`Use ${option.label.toLowerCase()} ${tool === "ink" ? "pen" : "highlighter"} thickness`}
                  title={`${option.label} thickness`}
                  aria-pressed={style.width === option.value}
                  onClick={() => onChange({ ...style, width: option.value })}
                >
                  <span
                    className={styles.widthSample}
                    style={
                      {
                        "--sample-width": `${option.sample}px`,
                      } as CSSProperties
                    }
                  />
                </button>
              ))}
            </div>
            {tool === "highlight" ? (
              <>
                <div className={styles.divider} />
                <div
                  className={styles.opacities}
                  role="group"
                  aria-label="Highlighter opacity"
                >
                  {highlighterOpacities.map((option) => (
                    <button
                      type="button"
                      key={option.value}
                      aria-label={`Use ${option.label.toLowerCase()} highlighter opacity`}
                      title={`${option.label} opacity`}
                      aria-pressed={style.opacity === option.value}
                      onClick={() =>
                        onChange({ ...style, opacity: option.value })
                      }
                    >
                      <span style={{ opacity: option.value }} />
                    </button>
                  ))}
                </div>
              </>
            ) : null}
            <div className={styles.divider} />
            <div
              className={styles.quickColors}
              role="group"
              aria-label="Recent colors"
            >
              {style.recentColors.map((color) => (
                <button
                  type="button"
                  key={color}
                  className={styles.swatch}
                  style={{ backgroundColor: color }}
                  aria-label={`Use ${color}`}
                  title={color}
                  aria-pressed={style.color === color}
                  onClick={() => chooseColor(color)}
                />
              ))}
              <button
                type="button"
                className={styles.paletteTrigger}
                aria-label="Choose another color"
                title="Choose another color"
                aria-expanded={paletteOpen}
                onClick={() => setPaletteOpen((open) => !open)}
              >
                <span aria-hidden="true">+</span>
              </button>
            </div>
          </>
        )}
      </div>
      {paletteOpen ? (
        <div
          className={styles.palette}
          role="dialog"
          aria-label={`${tool} color palette`}
        >
          <h2>
            {tool === "ink"
              ? "Pen color"
              : tool === "highlight"
                ? "Highlighter color"
                : "Text color"}
          </h2>
          <div className={styles.paletteGrid}>
            {annotationPalette.map((color) => (
              <button
                type="button"
                key={color}
                className={styles.swatch}
                style={{ backgroundColor: color }}
                aria-label={`Use ${color}`}
                title={color}
                aria-pressed={style.color === color}
                onClick={() => chooseColor(color)}
              />
            ))}
          </div>
          <label className={styles.customColor}>
            <span className={styles.colorWheel} aria-hidden="true" />
            <span>Custom color</span>
            <input
              type="color"
              value={style.color}
              aria-label="Choose a custom color"
              onChange={(event) => chooseColor(event.target.value)}
            />
          </label>
        </div>
      ) : null}
    </div>
  );
}
