export const RESPONSIVE_BREAKPOINTS = {
  mobile: 640,
  tablet: 1024,
  desktop: 1280,
}

export function isMobile(width: number): boolean {
  return width < RESPONSIVE_BREAKPOINTS.mobile
}

export function isTablet(width: number): boolean {
  return width >= RESPONSIVE_BREAKPOINTS.mobile && width < RESPONSIVE_BREAKPOINTS.tablet
}

export function isDesktop(width: number): boolean {
  return width >= RESPONSIVE_BREAKPOINTS.tablet
}

export function responsiveGridCols(width: number, desktop: number, tablet?: number, mobile?: number): number {
  if (width < RESPONSIVE_BREAKPOINTS.mobile) return mobile ?? 1
  if (width < RESPONSIVE_BREAKPOINTS.tablet) return tablet ?? 2
  return desktop
}
