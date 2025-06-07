
import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };

  return (
    <img 
      src="/lovable-uploads/8f377fa8-bfb6-4d05-b000-3d477e975e49.png" 
      alt="RoboHerd Logo" 
      className={`object-contain ${sizeClasses[size]} ${className}`}
    />
  );
};

export default Logo;
