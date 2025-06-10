
import React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

interface MobileLayoutProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const MobileLayout: React.FC<MobileLayoutProps> = ({ children, fallback }) => {
  const isMobile = useIsMobile();
  const forceDesktopView = localStorage.getItem('forceDesktopView') === 'true';

  // Show mobile interface if on mobile and not forcing desktop
  // Clear the forceDesktopView flag if it was set but user is on mobile
  if (isMobile) {
    if (forceDesktopView) {
      // Clear the old setting for mobile users
      localStorage.removeItem('forceDesktopView');
    }
    return <>{fallback}</>;
  }

  // Default to desktop layout
  return <>{children}</>;
};

export default MobileLayout;
