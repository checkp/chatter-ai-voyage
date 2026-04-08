
import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import ImageGeneration from '@/components/ImageGeneration';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Logo from '@/components/Logo';

const ImageGenerationPage = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <h1 className="text-2xl font-bold mb-4">Please sign in to continue.</h1>
        <Button onClick={() => window.location.href = '/auth'}>
          Go to Sign In
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-gradient-to-r from-primary/10 via-accent/10 to-secondary/10 p-4">
        <div className="flex items-center gap-4 max-w-6xl mx-auto">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate('/')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Chat
          </Button>
          <div className="flex items-center gap-3">
            <Logo size="sm" />
            <h1 className="text-xl font-semibold">AI Image Generation</h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="p-6">
        <ImageGeneration user={user} />
      </div>
    </div>
  );
};

export default ImageGenerationPage;
