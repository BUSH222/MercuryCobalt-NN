import type { ReactNode } from "react";

export type IconName =
  | "globe"
  | "compass"
  | "chart"
  | "compare"
  | "route"
  | "settings"
  | "upload"
  | "trash"
  | "chevron-left"
  | "chevron-right"
  | "chevron-down"
  | "satellite"
  | "dish"
  | "gateway"
  | "warning"
  | "info"
  | "check"
  | "close"
  | "plus"
  | "download"
  | "reset"
  | "play"
  | "brand"
  | "isl";

const SHAPES: Record<IconName, ReactNode> = {
  globe: (
    <>
      <path d="M3.5 5.5 8.5 3l7 3.5L20.5 4v15l-5 2.5-7-3.5-5 2.5z" />
      <path d="M8.5 3v15" />
      <path d="M15.5 6.5v15" />
    </>
  ),
  compass: <path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm3.5 5.5-2 5-5 2 2-5 5-2Z" />,
  chart: <path d="M4 20V10m6 10V4m6 16v-7M3 20h18" />,
  compare: <path d="M9 4v16M9 4 5 8m4-4 4 4M15 20V4m0 16 4-4m-4 4-4-4" />,
  route: (
    <>
      <path d="M5 5h7a4 4 0 0 1 0 8H7a4 4 0 0 0 0 8h8" />
      <circle cx="18" cy="21" r="2" />
    </>
  ),
  settings: (
    <>
      <circle cy="13" r="3" cx="12.75" />
      <path d="m19.5 12 1.2-.9-.8-2-1.5-.2a7 7 0 0 0-1.4-1.4l-.2-1.5-2-.8-.9 1.2a7 7 0 0 0-2 0l-.9-1.2-2 .8-.2 1.5a7 7 0 0 0-1.4 1.4l-1.5.2-.8 2 1.2.9a7 7 0 0 0 0 2l-1.2.9.8 2 1.5.2a7 7 0 0 0 1.4 1.4l.2 1.5 2 .8.9-1.2a7 7 0 0 0 2 0l.9 1.2 2-.8.2-1.5a7 7 0 0 0 1.4-1.4l1.5-.2.8-2-1.2-.9a7 7 0 0 0 0-2Z" />
    </>
  ),
  upload: <path d="M12 16V4m0 0 4 4m-4-4L8 8M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />,
  trash: <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-8 0 1 12a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-12" />,
  "chevron-left": <path d="M14.5 6 8.5 12l6 6" />,
  "chevron-right": <path d="M9.5 6l6 6-6 6" />,
  "chevron-down": <path d="M6 9.5 12 15.5 18 9.5" />,
  satellite: (
    <>
      <path d="M10 10h4v4h-4z" />
      <path d="M8 8 6 6h-3v3l2 2" />
      <path d="m16 8 2-2h3v3l-2 2" />
      <path d="M8 16 6 18H3v-3l2-2" />
      <path d="m16 16 2 2h3v-3l-2-2" />
    </>
  ),
  dish: (
    <>
      <path d="M10 20h4l-2-9-2 9Z" />
      <path d="M12 11V5" />
      <path d="M8 8a5 5 0 0 1 0-6" />
      <path d="M16 8a5 5 0 0 0 0-6" />
    </>
  ),
  gateway: <path d="M4 20h16M6 20V10l6-6 6 6v10M10 20v-6h4v6" />,
  warning: <path d="M12 4 2 20h20L12 4Zm0 6v4m0 3h.01" />,
  info: <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-5v-5m0-3h.01" />,
  check: <path d="M5 13l4 4L19 7" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  plus: <path d="M12 5v14M5 12h14" />,
  download: <path d="M12 4v12m0 0 4-4m-4 4-4-4M4 18v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2" />,
  reset: <path d="M4 4v5h5M20 20v-5h-5M4.5 9a8 8 0 0 1 14.6-3M19.5 15a8 8 0 0 1-14.6 3" />,
  play: <path d="M7 5.5v13l11-6.5-11-6.5Z" />,
  brand: (
    <>
      <ellipse cx="12" cy="12" rx="8" ry="4.5" transform="rotate(-30 12 12)" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="19" cy="8" r="1.5" />
    </>
  ),
  isl: (
    <>
      <circle cx="6" cy="17" r="2.5" />
      <circle cx="18" cy="7" r="2.5" />
      <path d="M8 15.5 16 8.5" strokeDasharray="2.5 2.5" />
    </>
  ),
};

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
}

export function Icon({ name, size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {SHAPES[name]}
    </svg>
  );
}
