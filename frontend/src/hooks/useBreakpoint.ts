import { useMediaQuery } from './useMediaQuery'

export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const

export function useBreakpoint() {
  const isMobile = useMediaQuery(`(max-width: ${breakpoints.md - 1}px)`)
  const isTablet = useMediaQuery(`(min-width: ${breakpoints.md}px) and (max-width: ${breakpoints.lg - 1}px)`)
  const isDesktop = useMediaQuery(`(min-width: ${breakpoints.lg}px)`)
  const isMobileOrTablet = useMediaQuery(`(max-width: ${breakpoints.lg - 1}px)`)

  return { isMobile, isTablet, isDesktop, isMobileOrTablet }
}
