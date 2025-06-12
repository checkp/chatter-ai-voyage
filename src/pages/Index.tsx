
import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import AppLoadingState from '@/components/AppLoadingState';
import LandingPage from '@/components/LandingPage';
import MainApp from '@/components/MainApp';

const Index = () => {
  const { user, loading, handleSignOut } = useAuth();

  // Show loading while auth is being determined
  if (loading) {
    return <AppLoadingState />;
  }

  // Show enhanced landing page if not authenticated
  if (!user) {
    return <LandingPage />;
  }

  // Show main app for authenticated users
  return <MainApp user={user} handleSignOut={handleSignOut} />;
};

export default Index;
