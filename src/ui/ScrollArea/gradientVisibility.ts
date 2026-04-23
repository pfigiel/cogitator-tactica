const BOTTOM_THRESHOLD = 8;

export const shouldShowGradient = (
  scrollHeight: number,
  clientHeight: number,
  scrollTop: number,
): boolean => {
  const hasOverflow = scrollHeight > clientHeight;
  const atBottom = scrollTop + clientHeight >= scrollHeight - BOTTOM_THRESHOLD;
  return hasOverflow && !atBottom;
};
