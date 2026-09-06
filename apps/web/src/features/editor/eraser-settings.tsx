import styles from "./annotation-settings-dock.module.css";

export function EraserSettings({
  mode,
  radius,
  sidebarOpen,
  onMode,
  onRadius,
}: {
  mode: "partial" | "stroke";
  radius: number;
  sidebarOpen: boolean;
  onMode: (mode: "partial" | "stroke") => void;
  onRadius: (radius: number) => void;
}) {
  return (
    <div className={styles.shell} data-sidebar-open={sidebarOpen}>
      <div className={styles.dock} role="group" aria-label="Eraser settings">
        <button
          style={{ width: "auto", padding: "0 12px" }}
          aria-pressed={mode === "partial"}
          onClick={() => onMode("partial")}
        >
          Partial
        </button>
        <button
          style={{ width: "auto", padding: "0 12px" }}
          aria-pressed={mode === "stroke"}
          onClick={() => onMode("stroke")}
        >
          Whole stroke
        </button>
        {mode === "partial" ? (
          <>
            <div className={styles.divider} />
            {[6, 12, 20].map((size, index) => (
              <button
                key={size}
                aria-label={`${["Small", "Medium", "Large"][index]} eraser`}
                title={`${["Small", "Medium", "Large"][index]} eraser`}
                aria-pressed={radius === size}
                onClick={() => onRadius(size)}
              >
                <span
                  style={{
                    width: size,
                    height: size,
                    border: "1px solid currentColor",
                    borderRadius: "50%",
                  }}
                />
              </button>
            ))}
          </>
        ) : null}
      </div>
    </div>
  );
}
