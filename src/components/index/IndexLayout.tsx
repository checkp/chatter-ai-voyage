
import React from 'react';
import MobileLayout from '@/components/mobile/MobileLayout';
import MobileInterface from '@/components/mobile/MobileInterface';
import DesktopInterface from '@/components/index/DesktopInterface';
import type { DesktopInterfaceProps } from '@/components/index/types';

interface IndexLayoutProps {
  desktopProps: DesktopInterfaceProps;
}

const IndexLayout: React.FC<IndexLayoutProps> = ({ desktopProps }) => {
  const DesktopInterfaceComponent = <DesktopInterface {...desktopProps} />;
  const MobileInterfaceComponent = <MobileInterface />;

  return (
    <MobileLayout fallback={MobileInterfaceComponent}>
      {DesktopInterfaceComponent}
    </MobileLayout>
  );
};

export default IndexLayout;
