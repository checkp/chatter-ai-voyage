
import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const checkMobile = () => {
      // Check screen width
      const isSmallScreen = window.innerWidth < MOBILE_BREAKPOINT
      
      // Check user agent for mobile devices
      const userAgent = navigator.userAgent.toLowerCase()
      const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent)
      
      // Check for touch support
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0
      
      // Consider it mobile if any of these conditions are true
      const isMobileDevice = isSmallScreen || (isMobileUA && isTouchDevice)
      
      setIsMobile(isMobileDevice)
    }

    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => checkMobile()
    
    mql.addEventListener("change", onChange)
    checkMobile() // Initial check
    
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}
