export const shouldShowGradient = (
  scrollHeight: number,
  clientHeight: number,
  scrollTop: number,
): boolean => scrollHeight > clientHeight && scrollTop === 0;
