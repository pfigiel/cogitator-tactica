export const breakpoints = {
  xs: 480,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const;

export type Breakpoint = keyof typeof breakpoints;

/** Returns a min-width media query string, e.g. `"(min-width: 768px)"` */
export const mq = (bp: Breakpoint): string =>
  `(min-width: ${breakpoints[bp]}px)`;
