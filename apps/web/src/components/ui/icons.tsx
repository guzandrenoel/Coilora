import type { ReactNode, SVGProps } from "react";

type IconProps = Omit<SVGProps<SVGSVGElement>, "children">;

function IconFrame({
  children,
  ...props
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {children}
    </svg>
  );
}

export function LibraryIcon(props: IconProps) {
  return (
    <IconFrame {...props}>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21.5v-16Z" />
      <path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v16h4.5a2.5 2.5 0 0 1 2.5 2.5v-16Z" />
    </IconFrame>
  );
}

export function HomeIcon(props: IconProps) {
  return (
    <IconFrame {...props}>
      <path d="m3 10 9-7 9 7" />
      <path d="M5 9v11h14V9" />
      <path d="M9 20v-6h6v6" />
    </IconFrame>
  );
}

export function UploadIcon(props: IconProps) {
  return (
    <IconFrame {...props}>
      <path d="M12 16V4" />
      <path d="m7 9 5-5 5 5" />
      <path d="M5 20h14" />
    </IconFrame>
  );
}

export function FileIcon(props: IconProps) {
  return (
    <IconFrame {...props}>
      <path d="M6 2.5h8l4 4V21H6z" />
      <path d="M14 2.5V7h4" />
      <path d="M9 12h6M9 16h6" />
    </IconFrame>
  );
}

export function BookmarkIcon(props: IconProps) {
  return (
    <IconFrame {...props}>
      <path d="M6 3h12v18l-6-4-6 4V3Z" />
    </IconFrame>
  );
}

export function PagePanelIcon(props: IconProps) {
  return (
    <IconFrame {...props}>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M9 3v18M5.5 7h1M5.5 10h1M5.5 13h1" />
    </IconFrame>
  );
}

export function PenIcon(props: IconProps) {
  return (
    <IconFrame {...props}>
      <path d="m4 20 4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20Z" />
      <path d="m13.5 8 3 3" />
    </IconFrame>
  );
}

export function HandIcon(props: IconProps) {
  return (
    <IconFrame {...props}>
      <path d="M8 13V6.5a1.5 1.5 0 0 1 3 0v-2a1.5 1.5 0 0 1 3 0v2a1.5 1.5 0 0 1 3 0v3a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-1a6 6 0 0 1-4.5-2L3.5 13.5a1.7 1.7 0 0 1 2.4-2.4L8 13Z" />
      <path d="M11 6.5V12M14 6.5V12M17 9.5V13" />
    </IconFrame>
  );
}

export function HighlighterIcon(props: IconProps) {
  return (
    <IconFrame {...props}>
      <path d="m9 11 6-6 4 4-6 6" />
      <path d="m8 12-3 3 4 4 3-3" />
      <path d="M4 21h8" />
    </IconFrame>
  );
}

export function SparkIcon(props: IconProps) {
  return (
    <IconFrame {...props}>
      <path d="M12 3c.7 4.4 3.1 6.8 7.5 7.5-4.4.7-6.8 3.1-7.5 7.5-.7-4.4-3.1-6.8-7.5-7.5C8.9 9.8 11.3 7.4 12 3Z" />
      <path d="M19 17c.2 1.4 1.1 2.3 2.5 2.5-1.4.2-2.3 1.1-2.5 2.5-.2-1.4-1.1-2.3-2.5-2.5 1.4-.2 2.3-1.1 2.5-2.5Z" />
    </IconFrame>
  );
}

export function PracticeIcon(props: IconProps) {
  return (
    <IconFrame {...props}>
      <path d="M9 4h6l1 2h3v15H5V6h3l1-2Z" />
      <path d="m8.5 13 2 2 5-5" />
    </IconFrame>
  );
}

export function ReviewIcon(props: IconProps) {
  return (
    <IconFrame {...props}>
      <path d="M20 11a8 8 0 1 0-2.34 5.66" />
      <path d="M20 4v7h-7" />
    </IconFrame>
  );
}

export function LockIcon(props: IconProps) {
  return (
    <IconFrame {...props}>
      <rect x="5" y="10" width="14" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </IconFrame>
  );
}

export function ShieldCheckIcon(props: IconProps) {
  return (
    <IconFrame {...props}>
      <path d="M12 3 5 6v5c0 4.6 2.8 8.1 7 10 4.2-1.9 7-5.4 7-10V6l-7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </IconFrame>
  );
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <IconFrame {...props}>
      <path d="M5 12h14" />
      <path d="m14 7 5 5-5 5" />
    </IconFrame>
  );
}

export function LogOutIcon(props: IconProps) {
  return (
    <IconFrame {...props}>
      <path d="M10 5H5v14h5" />
      <path d="M14 8l4 4-4 4" />
      <path d="M18 12H9" />
    </IconFrame>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <IconFrame {...props}>
      <path d="m5 12 4 4L19 6" />
    </IconFrame>
  );
}

export function ArchiveIcon(props: IconProps) {
  return (
    <IconFrame {...props}>
      <path d="M4 7h16v13H4z" />
      <path d="M3 3h18v4H3z" />
      <path d="M9 11h6" />
    </IconFrame>
  );
}
