
import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import TokenPurchase from '@/components/TokenPurchase';

const Purchase = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

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
        <Button onClick={() => navigate('/auth')}>
          Go to Sign In
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-secondary border-border p-4">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-semibold">Purchase Tokens</h1>
        </div>
      </header>
      
      <main className="container mx-auto p-6">
        <TokenPurchase user={user} />
      </main>
    </div>
  );
};

export default Purchase;
