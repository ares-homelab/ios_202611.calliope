import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';

const ICONS = {
  home: <Path d="M4 11l8-6 8 6v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" />,
  paths: (
    <>
      <Circle cx="6" cy="18" r="2" />
      <Circle cx="18" cy="6" r="2" />
      <Path d="M8 18h6a3 3 0 0 0 0-6h-4a3 3 0 0 1 0-6h6" />
    </>
  ),
  stats: <Path d="M5 20v-8M12 20V5M19 20v-5" />,
  highlights: <Path d="M6 7h4v4c0 3-1.5 5-4 6M14 7h4v4c0 3-1.5 5-4 6" />,
  issues: (
    <>
      <Rect x="4" y="5" width="13" height="14" rx="1" />
      <Path d="M17 9h3v8.5a1.5 1.5 0 0 1-3 0M7 9h7M7 12.5h7M7 16h4" />
    </>
  ),
  gear: (
    <>
      <Circle cx="12" cy="12" r="3" />
      <Path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </>
  ),
  next: <Path d="M9 6l6 6-6 6" />,
  back: <Path d="M15 6l-6 6 6 6" />,
  search: (
    <>
      <Circle cx="11" cy="11" r="6" />
      <Path d="M20 20l-4.5-4.5" />
    </>
  ),
  bookmark: <Path d="M7 3h10v18l-5-4-5 4z" />,
  more: (
    <>
      <Circle cx="5" cy="12" r="1.7" />
      <Circle cx="12" cy="12" r="1.7" />
      <Circle cx="19" cy="12" r="1.7" />
    </>
  ),
  kindle: (
    <>
      <Rect x="5" y="3" width="14" height="18" rx="2" />
      <Path d="M9 12l2 2 4-4" />
    </>
  ),
  send: (
    <>
      <Rect x="5" y="3" width="14" height="18" rx="2" />
      <Path d="M12 7v7M9 11l3 3 3-3" />
    </>
  ),
  moon: <Path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />,
  sun: (
    <>
      <Circle cx="12" cy="12" r="4" />
      <Path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5" />
    </>
  ),
  phone: (
    <>
      <Rect x="7" y="3" width="10" height="18" rx="2" />
      <Path d="M11 18h2" />
    </>
  ),
  palette: (
    <>
      <Path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.6-.9 1.2-1.8-.5-1 .2-2.2 1.3-2.2H17a4 4 0 0 0 4-4c0-5.5-4-10-9-10z" />
      <Circle cx="7.5" cy="11" r="1" />
      <Circle cx="10" cy="7" r="1" />
      <Circle cx="15" cy="7.5" r="1" />
    </>
  ),
  queue: (
    <>
      <Rect x="5" y="3" width="14" height="18" rx="2" />
      <Path d="M8 7h8M8 10.5h8M8 14h5" />
    </>
  ),
  server: (
    <>
      <Rect x="4" y="5" width="16" height="6" rx="1.5" />
      <Rect x="4" y="13" width="16" height="6" rx="1.5" />
      <Path d="M8 8h.01M8 16h.01" />
    </>
  ),
  key: (
    <>
      <Circle cx="8" cy="15" r="4" />
      <Path d="M11 12l8-8M16 7l2 2" />
    </>
  ),
  database: (
    <>
      <Ellipse cx="12" cy="6" rx="7" ry="2.5" />
      <Path d="M5 6v12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V6M5 12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5" />
    </>
  ),
  wrench: <Path d="M14.5 6.5a4 4 0 0 0-5 5L4 17l3 3 5.5-5.5a4 4 0 0 0 5-5l-2.5 2.5-3-3z" />,
  share: <Path d="M12 4v11M8 8l4-4 4 4M5 14v5h14v-5" />,
  pencil: <Path d="M4 20l4-1 11-11-3-3L5 16z" />,
  clock: (
    <>
      <Circle cx="12" cy="12" r="8" />
      <Path d="M12 8v4l3 2" />
    </>
  ),
  music: (
    <>
      <Path d="M9 18V5l12-2v13" strokeWidth={2.2} />
      <Path d="M9 5l12-2v4L9 9z" fill="currentColor" />
      <Circle cx="6" cy="18" r="3" fill="currentColor" />
      <Circle cx="18" cy="16" r="3" fill="currentColor" />
    </>
  ),
  headphones: (
    <>
      <Path d="M3 18v-6a9 9 0 0 1 18 0v6" strokeWidth={2.2} />
      <Path d="M21 19a2 2 0 0 1-2 2h-1v-6h3zM3 19a2 2 0 0 0 2 2h1v-6H3z" fill="currentColor" />
    </>
  ),
  book: (
    <>
      <Path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z" fill="currentColor" />
      <Path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5" />
    </>
  ),
  homeFill: <Path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" fill="currentColor" />,
  find: (
    <>
      <Circle cx="11" cy="11" r="7" strokeWidth={2.6} />
      <Path d="M21 21l-4.3-4.3" strokeWidth={2.8} />
    </>
  ),
  play: <Path d="M7 4l13 8-13 8z" fill="currentColor" />,
  pause: <Path d="M7 4h3v16H7zM14 4h3v16h-3z" fill="currentColor" />,
  prev: (
    <>
      <Path d="M19 5L9 12l10 7z" fill="currentColor" />
      <Path d="M6 5v14" />
    </>
  ),
  skip: (
    <>
      <Path d="M5 5l10 7-10 7z" fill="currentColor" />
      <Path d="M18 5v14" />
    </>
  ),
  back30: (
    <>
      <Path d="M3 12a9 9 0 1 0 3-6.7" />
      <Path d="M3 3v5h5" />
    </>
  ),
  fwd30: (
    <>
      <Path d="M21 12a9 9 0 1 1-3-6.7" />
      <Path d="M21 3v5h-5" />
    </>
  ),
  heart: <Path d="M12 21s-7-4.5-9.3-9A5.2 5.2 0 0 1 12 6a5.2 5.2 0 0 1 9.3 6c-2.3 4.5-9.3 9-9.3 9z" />,
  download: <Path d="M12 4v12M6 11l6 6 6-6M5 21h14" />,
  downloaded: (
    <>
      <Circle cx="12" cy="12" r="9" />
      <Path d="M12 7v8M8.5 11.5L12 15l3.5-3.5" />
    </>
  ),
  shuffle: <Path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />,
  sparkle: <Path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />,
  lyrics: <Path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
  volLow: <Path d="M11 5L6 9H3v6h3l5 4z" />,
  volHigh: <Path d="M11 5L6 9H3v6h3l5 4zM15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14" />,
  down: <Path d="M6 9l6 6 6-6" />,
  close: <Path d="M6 6l12 12M18 6L6 18" />,
  list: <Path d="M4 6h16M4 12h16M4 18h10" />,
  plus: <Path d="M12 5v14M5 12h14" />,
  pin: <Path d="M9 4h6l-1 6 4 4H6l4-4zM12 14v7" />,
  repeat: <Path d="M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3" />,
  sync: (
    <>
      <Path d="M21 12a9 9 0 0 1-15 6.7L3 16M3 12a9 9 0 0 1 15-6.7L21 8" />
      <Path d="M21 3v5h-5M3 21v-5h5" />
    </>
  ),
  check: <Path d="M5 12l5 5 9-10" />,
  note: <Path d="M4 20l4-1 11-11-3-3L5 16zM14 6l3 3" />,
  share2: <Path d="M12 4v11M8 8l4-4 4 4M5 14v5h14v-5" />,
  bars: (
    <>
      <Rect x="3" y="11" width="4" height="9" rx="1" fill="currentColor" />
      <Rect x="10" y="5" width="4" height="15" rx="1" fill="currentColor" />
      <Rect x="17" y="13" width="4" height="7" rx="1" fill="currentColor" />
    </>
  ),
  offline: <Path d="M3 9a14 14 0 0 1 18 0M6.5 12.5a9 9 0 0 1 11 0M10 16a4 4 0 0 1 4 0M4 4l16 16" />,
};

export type IconName = keyof typeof ICONS;

const FILLED: IconName[] = ['bookmark', 'more'];

export function Icon({ name, size = 22, color, width = 1.8, filled }: { name: IconName; size?: number; color: string; width?: number; filled?: boolean }) {
  const fill = filled || FILLED.includes(name) ? color : 'none';
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color} color={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round">
      {ICONS[name]}
    </Svg>
  );
}
