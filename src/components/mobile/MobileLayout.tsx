
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
  if (isMobile && !forceDesktopView) {
    return <>{fallback || children}</>;
  }

  // Default to desktop layout
  return <>{children}</>;
};

export default MobileLayout;
