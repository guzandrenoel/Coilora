import type { Ref } from "react";
import { PagePanelIcon } from "@/components/ui/icons";
import styles from "./page-panel-toggle.module.css";

export function PagePanelToggle({
  open,
  onToggle,
  panelId,
  disabled,
  ref,
}: {
  open: boolean;
  onToggle: () => void;
  panelId: string;
  disabled?: boolean;
  ref?: Ref<HTMLButtonElement>;
}) {
  const label = open ? "Hide pages" : "Show pages";
  return (
    <button
      ref={ref}
      type="button"
      className={styles.toggle}
      aria-label={label}
      title={label}
      aria-expanded={open}
      aria-controls={panelId}
      disabled={disabled}
      onClick={onToggle}
    >
      <PagePanelIcon />
    </button>
  );
}
