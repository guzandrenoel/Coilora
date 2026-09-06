"use client";
import { useEffect, useId, useRef, useState } from "react";
import { EraserIcon } from "@/components/ui/icons";
import styles from "./annotation-settings-dock.module.css";
import eraserStyles from "./eraser-settings.module.css";

export type EraserMode = "partial" | "stroke";
const types = [
  {
    value: "partial",
    label: "Standard",
    description: "Wipe away the parts of strokes you pass over.",
  },
  {
    value: "stroke",
    label: "Stroke",
    description: "Erase entire annotations by clicking them once.",
  },
] as const;

export function EraserSettings({
  mode,
  radius,
  sidebarOpen,
  onMode,
  onRadius,
}: {
  mode: EraserMode;
  radius: number;
  sidebarOpen: boolean;
  onMode: (mode: EraserMode) => void;
  onRadius: (radius: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const selected = useRef<HTMLButtonElement>(null);
  const id = useId();
  const active = types.find((type) => type.value === mode) ?? types[0];
  useEffect(() => {
    if (!open) return;
    selected.current?.focus();
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target))
        setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setOpen(false);
      trigger.current?.focus();
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  return (
    <div
      ref={root}
      className={styles.shell}
      data-sidebar-open={sidebarOpen}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <div className={styles.dock} role="group" aria-label="Eraser settings">
        <button
          ref={trigger}
          type="button"
          className={eraserStyles.trigger}
          aria-label={`Eraser type: ${active.label}`}
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-controls={id}
          onClick={() => setOpen((value) => !value)}
        >
          <EraserIcon aria-hidden="true" />
          <span>{active.label}</span>
          <span className={eraserStyles.chevron} aria-hidden="true" />
        </button>
        <div className={styles.divider} />
        <div
          className={`${styles.widths} ${eraserStyles.sizes}`}
          role="group"
          aria-label="Eraser size"
        >
          {[6, 12, 20].map((size, index) => (
            <button
              key={size}
              type="button"
              disabled={mode === "stroke"}
              aria-label={`${["Small", "Medium", "Large"][index]} eraser`}
              title={
                mode === "stroke"
                  ? "Size applies to Standard erasing"
                  : `${["Small", "Medium", "Large"][index]} eraser`
              }
              aria-pressed={radius === size}
              onClick={() => onRadius(size)}
            >
              <span
                className={eraserStyles.sizeSample}
                style={{ width: 12 + index * 9, height: 12 + index * 9 }}
              />
            </button>
          ))}
        </div>
      </div>
      {open ? (
        <div
          id={id}
          className={eraserStyles.popover}
          role="dialog"
          aria-labelledby={`${id}-title`}
          aria-describedby={`${id}-description`}
        >
          <h2 id={`${id}-title`}>Eraser Type</h2>
          <div
            className={eraserStyles.types}
            role="group"
            aria-label="Eraser type"
          >
            {types.map((type) => (
              <button
                key={type.value}
                ref={mode === type.value ? selected : undefined}
                type="button"
                aria-pressed={mode === type.value}
                data-mode={type.value}
                onClick={() => onMode(type.value)}
              >
                <EraserIcon aria-hidden="true" />
                <span>
                  {type.label}
                  <br />
                  Eraser
                </span>
              </button>
            ))}
          </div>
          <p id={`${id}-description`}>{active.description}</p>
        </div>
      ) : null}
    </div>
  );
}
