
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
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4">
        <div className="flex flex-col items-center space-y-8 max-w-2xl w-full">
          <img 
            src="/lovable-uploads/90258cc1-9b63-4dac-b077-ccc51f69f93e.png" 
            alt="AI Chat Logo" 
            className="w-3/4 max-w-lg h-auto object-contain"
          />
          <div className="text-center space-y-6">
            <h1 className="text-3xl font-bold text-gray-800">Please sign in to continue</h1>
            <p className="text-lg text-gray-600">Access your account to purchase tokens and manage your AI chat experience.</p>
            <Button 
              onClick={() => navigate('/auth')} 
              size="lg"
              className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 px-8 py-3 text-lg"
            >
              Go to Sign In
            </Button>
          </div>
        </div>
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
