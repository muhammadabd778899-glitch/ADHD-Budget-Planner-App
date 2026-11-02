import type { ReactNode, SVGProps } from 'react';

export type IconName =
  | 'home'
  | 'calendar'
  | 'calendar-check'
  | 'receipt'
  | 'wallet'
  | 'card'
  | 'sparkle'
  | 'chart'
  | 'settings'
  | 'search'
  | 'menu'
  | 'download'
  | 'upload'
  | 'trash'
  | 'edit'
  | 'pause'
  | 'play'
  | 'chevron-right'
  | 'chevron-down'
  | 'arrow-up'
  | 'arrow-down'
  | 'arrow-right'
  | 'check'
  | 'check-circle'
  | 'alert-circle'
  | 'info'
  | 'x'
  | 'plus'
  | 'minus'
  | 'undo'
  | 'shield'
  | 'lock'
  | 'offline'
  | 'refresh'
  | 'sun'
  | 'moon'
  | 'monitor'
  | 'basket'
  | 'bus'
  | 'heart'
  | 'dot'
  | 'flag'
  | 'piggy'
  | 'target'
  | 'clock'
  | 'filter'
  | 'more'
  | 'help'
  | 'database'
  | 'list'
  | 'spark';

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number;
}

export function Icon({ name, size = 20, strokeWidth = 1.8, ...props }: IconProps) {
  const paths: Record<IconName, ReactNode> = {
    home: (
      <>
        <path d="M3 10.8 12 3l9 7.8V20a1 1 0 0 1-1 1h-5v-6.5H9V21H4a1 1 0 0 1-1-1Z" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="3" />
        <path d="M8 3v4M16 3v4M3 10h18" />
      </>
    ),
    'calendar-check': (
      <>
        <rect x="3" y="5" width="18" height="16" rx="3" />
        <path d="M8 3v4M16 3v4M3 10h18M8.5 15l2.2 2.2 4.3-4.4" />
      </>
    ),
    receipt: (
      <>
        <path d="M5 3h14v18l-2.3-1.5L14.4 21l-2.4-1.5L9.6 21l-2.3-1.5L5 21Z" />
        <path d="M8 8h8M8 12h8M8 16h4.5" />
      </>
    ),
    wallet: (
      <>
        <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H19a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5.5A2.5 2.5 0 0 1 3 17.5Z" />
        <path d="M3 8h18M16 13h3" />
      </>
    ),
    card: (
      <>
        <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
        <path d="M2.5 10h19M6 15h4" />
      </>
    ),
    sparkle: (
      <>
        <path d="M12 3.5c.6 4.2 2.3 6 6.5 6.5-4.2.6-5.9 2.3-6.5 6.5-.6-4.2-2.3-5.9-6.5-6.5 4.2-.5 5.9-2.3 6.5-6.5Z" />
        <path d="M18.5 15.5c.3 1.8 1 2.5 2.8 2.8-1.8.3-2.5 1-2.8 2.8-.3-1.8-1-2.5-2.8-2.8 1.8-.3 2.5-1 2.8-2.8Z" />
      </>
    ),
    chart: (
      <>
        <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
      </>
    ),
    settings: (
      <>
        <path d="M4 6h16M4 12h16M4 18h16" />
        <circle cx="8" cy="6" r="2.2" fill="currentColor" stroke="none" />
        <circle cx="16" cy="12" r="2.2" fill="currentColor" stroke="none" />
        <circle cx="10" cy="18" r="2.2" fill="currentColor" stroke="none" />
      </>
    ),
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m15.5 15.5 5 5" />
      </>
    ),
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    download: (
      <>
        <path d="M12 3v12m0 0 4.5-4.5M12 15l-4.5-4.5" />
        <path d="M4 17v3h16v-3" />
      </>
    ),
    upload: (
      <>
        <path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5" />
        <path d="M4 17v3h16v-3" />
      </>
    ),
    trash: (
      <>
        <path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6M14 11v6" />
      </>
    ),
    edit: (
      <>
        <path d="m4 20 4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10Z" />
        <path d="m14 7 3 3" />
      </>
    ),
    pause: <path d="M9 5v14M15 5v14" />,
    play: <path d="m8 5 11 7-11 7Z" />,
    'chevron-right': <path d="m9 5 7 7-7 7" />,
    'chevron-down': <path d="m5 9 7 7 7-7" />,
    'arrow-up': <path d="M12 20V4m0 0L5 11m7-7 7 7" />,
    'arrow-down': <path d="M12 4v16m0 0 7-7m-7 7-7-7" />,
    'arrow-right': <path d="M4 12h16m0 0-7-7m7 7-7 7" />,
    check: <path d="m4 12 5 5L20 6" />,
    'check-circle': (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m8 12 2.7 2.7L16.5 9" />
      </>
    ),
    'alert-circle': (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7.5v5.5M12 16.5h.01" />
      </>
    ),
    info: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v5.5M12 7.5h.01" />
      </>
    ),
    x: <path d="m6 6 12 12M18 6 6 18" />,
    plus: <path d="M12 5v14M5 12h14" />,
    minus: <path d="M5 12h14" />,
    undo: (
      <>
        <path d="M9 7 4 12l5 5" />
        <path d="M4 12h9a6 6 0 0 1 6 6v1" />
      </>
    ),
    shield: (
      <>
        <path d="M12 3 5 6v5c0 4.5 2.8 8 7 10 4.2-2 7-5.5 7-10V6Z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
    lock: (
      <>
        <rect x="5" y="10" width="14" height="11" rx="2.5" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" />
      </>
    ),
    offline: (
      <>
        <path d="M3 3l18 18" />
        <path d="M8.5 8.5A9 9 0 0 1 21 10M5 12a12 12 0 0 1 3.5-1.8M8.5 15.5a6 6 0 0 1 6.5-1M12 19h.01" />
      </>
    ),
    refresh: (
      <>
        <path d="M20 11a8 8 0 1 0-2.3 6" />
        <path d="M20 4v7h-7" />
      </>
    ),
    sun: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
      </>
    ),
    moon: <path d="M20 15.5A8.5 8.5 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z" />,
    monitor: (
      <>
        <rect x="3" y="4" width="18" height="13" rx="2" />
        <path d="M8 21h8M12 17v4" />
      </>
    ),
    basket: (
      <>
        <path d="M4 10h16l-2 10H6Z" />
        <path d="m8 10 4-7 4 7M9 14v3M15 14v3" />
      </>
    ),
    bus: (
      <>
        <rect x="4" y="3" width="16" height="16" rx="3" />
        <path d="M4 11h16M8 19v2M16 19v2M7 7h10" />
        <circle cx="8" cy="15" r="1" fill="currentColor" stroke="none" />
        <circle cx="16" cy="15" r="1" fill="currentColor" stroke="none" />
      </>
    ),
    heart: (
      <path d="M12 20s-7-4.4-7-9.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 7 3.5C19 15.6 12 20 12 20Z" />
    ),
    dot: <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" />,
    flag: (
      <>
        <path d="M5 21V4M5 4h11l-2 4 2 4H5" />
      </>
    ),
    piggy: (
      <>
        <path d="M5 11a7 7 0 0 1 14 0v3.5a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3Z" />
        <path d="M9 17.5V21h3v-3.5M17 13h.01M8 8.5 7 5h3M18 8l2-1" />
      </>
    ),
    target: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <circle cx="12" cy="12" r="4.5" />
        <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5.5l3.5 2" />
      </>
    ),
    filter: <path d="M3 5h18l-7 8v6l-4 2v-8Z" />,
    more: (
      <>
        <circle cx="5" cy="12" r="1.6" fill="currentColor" stroke="none" />
        <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
        <circle cx="19" cy="12" r="1.6" fill="currentColor" stroke="none" />
      </>
    ),
    help: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M9.5 9a2.6 2.6 0 1 1 3.5 2.45c-.7.3-1 .8-1 1.55v.5M12 17h.01" />
      </>
    ),
    database: (
      <>
        <ellipse cx="12" cy="5.5" rx="7" ry="3" />
        <path d="M5 5.5v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6M5 11.5v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" />
      </>
    ),
    list: (
      <>
        <path d="M9 6h12M9 12h12M9 18h12" />
        <circle cx="4.5" cy="6" r="1" fill="currentColor" stroke="none" />
        <circle cx="4.5" cy="12" r="1" fill="currentColor" stroke="none" />
        <circle cx="4.5" cy="18" r="1" fill="currentColor" stroke="none" />
      </>
    ),
    spark: <path d="M13 2 4 14h6l-1 8 9-12h-6Z" />,
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
