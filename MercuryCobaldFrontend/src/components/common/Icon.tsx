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
  | "check"
  | "close"
  | "plus"
  | "download"
  | "reset"
  | "play";

const PATHS: Record<IconName, string> = {
  globe:
    "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 0c2.5 2.4 3.8 5.5 3.8 9s-1.3 6.6-3.8 9m0-18c-2.5 2.4-3.8 5.5-3.8 9s1.3 6.6 3.8 9M3.5 9h17M3.5 15h17",
  compass:
    "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm3.5 5.5-2 5-5 2 2-5 5-2Z",
  chart: "M4 20V10m6 10V4m6 16v-7M3 20h18",
  compare: "M9 4v16M9 4 5 8m4-4 4 4M15 20V4m0 16 4-4m-4 4-4-4",
  route:
    "M5 19c1.5 0 2-1 2-2.2 0-1.3-1-2-2-2s-2 .7-2 2c0 1.2.5 2.2 2 2.2Zm0 0c1.5 0 2-2 3.5-5.5S12 6 13.5 6 17 8 17 9.5c0 2-2 2.5-2 2.5m3.5 6c1.5 0 2-1 2-2.2 0-1.3-1-2-2-2s-2 .7-2 2c0 1.2.5 2.2 2 2.2Z",
  settings:
    "M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM4.6 13.5l-1.4.3a1 1 0 0 1-1.1-1.4l.6-1.3-.6-1.3a1 1 0 0 1 1.1-1.4l1.4.3.9-1.1-.2-1.4a1 1 0 0 1 1.3-1.1l1.3.6 1.3-.6a1 1 0 0 1 1.3 1.1l-.2 1.4.9 1.1 1.4-.3a1 1 0 0 1 1.1 1.4l-.6 1.3.6 1.3a1 1 0 0 1-1.1 1.4l-1.4-.3-.9 1.1.2 1.4a1 1 0 0 1-1.3 1.1l-1.3-.6-1.3.6a1 1 0 0 1-1.3-1.1l.2-1.4-.9-1.1Z",
  upload: "M12 16V4m0 0 4 4m-4-4L8 8M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3",
  trash: "M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-8 0 1 12a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-12",
  "chevron-left": "M14.5 6 8.5 12l6 6",
  "chevron-right": "M9.5 6l6 6-6 6",
  "chevron-down": "M6 9.5 12 15.5 18 9.5",
  satellite:
    "M14.5 9.5 17 7l3 3-2.5 2.5M6.5 17.5 9 15l3 3-2.5 2.5M9 15l6-6M3 21l3-3m9-13 2-2m4 4-2 2M13 4l1.5 1.5M18.5 9.5 20 11",
  dish: "M4 15a8 8 0 0 1 13-6.2M12 15v6m-3 0h6M4 15l8-8 4 4-8 8-4-4Z",
  gateway: "M4 20h16M6 20V10l6-6 6 6v10M10 20v-6h4v6",
  warning: "M12 4 2 20h20L12 4Zm0 6v4m0 3h.01",
  check: "M5 13l4 4L19 7",
  close: "M6 6l12 12M18 6 6 18",
  plus: "M12 5v14M5 12h14",
  download: "M12 4v12m0 0 4-4m-4 4-4-4M4 18v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2",
  reset: "M4 4v5h5M20 20v-5h-5M4.5 9a8 8 0 0 1 14.6-3M19.5 15a8 8 0 0 1-14.6 3",
  play: "M7 5.5v13l11-6.5-11-6.5Z",
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
      <path d={PATHS[name]} />
    </svg>
  );
}
