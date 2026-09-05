"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { HighlighterIcon, PenIcon, TextIcon } from "@/components/ui/icons";
import {
  selectDrawingColor,
  type DrawingStyle,
  type DrawingTool,
} from "./annotation-tool-settings";
import styles from "./annotation-settings-dock.module.css";

const palette = [
  "#111111",
  "#666666",
  "#a3a3a3",
  "#d4d4d4",
  "#ffffff",
  "#ff1f1f",
  "#9c36a4",
  "#ff5d62",
  "#ff9aa2",
  "#ff9e2c",
  "#1687ea",
  "#155a9c",
  "#119c6b",
  "#76c442",
  "#fff36a",
];

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
}: {
  tool: DrawingTool;
  style: DrawingStyle;
  sidebarOpen: boolean;
  onChange: (style: DrawingStyle) => void;
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
    >
      <div
        className={styles.dock}
        role="group"
        aria-label={`${tool} settings`}
      >
        <div
          className={styles.toolMarker}
          title={
            tool === "ink" ? "Pen" : tool === "highlight" ? "Highlighter" : "Text"
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
        <div
          className={styles.widths}
          role="group"
          aria-label={tool === "text" ? "Text size" : "Stroke thickness"}
        >
          {widths[tool].map((option) => (
            <button
              type="button"
              key={option.value}
              aria-label={
                tool === "text"
                  ? `Use ${option.label.toLowerCase()} text`
                  : `Use ${option.label.toLowerCase()} ${tool === "ink" ? "pen" : "highlighter"} thickness`
              }
              title={`${option.label} ${tool === "text" ? "text" : "thickness"}`}
              aria-pressed={style.width === option.value}
              onClick={() => onChange({ ...style, width: option.value })}
            >
              {tool === "text" ? (
                <span
                  className={styles.textSizeSample}
                  style={{ fontSize: `${option.sample}px` }}
                >
                  A
                </span>
              ) : (
                <span
                  className={styles.widthSample}
                  style={
                    { "--sample-width": `${option.sample}px` } as CSSProperties
                  }
                />
              )}
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
                  onClick={() => onChange({ ...style, opacity: option.value })}
                >
                  <span style={{ opacity: option.value }} />
                </button>
              ))}
            </div>
          </>
        ) : null}
        <div className={styles.divider} />
        <div className={styles.quickColors} role="group" aria-label="Recent colors">
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
            {palette.map((color) => (
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
