import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const Success = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const processedRef = useRef(false);
  const retryCountRef = useRef(0);

  const sessionId = searchParams.get('session_id');
  const checkoutId = searchParams.get('checkout_id');
  const packageId = searchParams.get('package_id');
  const provider = searchParams.get('provider');

  useEffect(() => {
    const processPayment = async () => {
      let shouldRetry = false;

      if (processedRef.current) return;
      if (!sessionId && !checkoutId && !packageId) return;
      processedRef.current = true;

      setIsProcessing(true);
      setError(null);

      try {
        const session = (await supabase.auth.getSession()).data.session;
        const accessToken = session?.access_token;

        if (!accessToken) {
          if (retryCountRef.current < 8) {
            retryCountRef.current += 1;
            shouldRetry = true;
            processedRef.current = false;
            setTimeout(() => {
              void processPayment();
            }, 1000);
            return;
          }

          throw new Error('You need to be signed in to finish this purchase.');
        }

        const isLemon = provider === 'lemonsqueezy' || !!packageId || !!checkoutId;
        const fnName = isLemon ? 'verify-lemonsqueezy-order' : 'verify-stripe-session';
        const body = isLemon
          ? { package_id: packageId }
          : { session_id: sessionId };

        const response = await supabase.functions.invoke(fnName, {
          body,
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (response.error) {
          throw new Error(response.error.message || 'Failed to verify payment');
        }

        if (response.data?.pending) {
          shouldRetry = true;
          processedRef.current = false;
          setTimeout(() => {
            void processPayment();
          }, 2500);
          return;
        }

        if (response.data?.success) {
          retryCountRef.current = 0;
          setIsCompleted(true);
          if (response.data.alreadyProcessed) {
            toast.success('Payment already processed.');
          } else {
            toast.success(`Successfully added ${response.data.tokensAdded.toLocaleString()} tokens to your account!`);
          }
        }
      } catch (error: any) {
        console.error('Payment processing error:', error);
        setError(error.message);
        toast.error('Failed to process payment: ' + error.message);
      } finally {
        if (!shouldRetry && !isCompleted) {
          setIsProcessing(false);
        }
      }
    };

    processPayment();
  }, [sessionId, checkoutId, packageId, provider, isCompleted]);

  const handleReturnHome = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {isProcessing ? (
              <Loader2 className="w-16 h-16 text-primary animate-spin" />
            ) : error ? (
              <AlertCircle className="w-16 h-16 text-destructive" />
            ) : (
              <CheckCircle className="w-16 h-16 text-green-500" />
            )}
          </div>
          <CardTitle className="text-2xl">
            {isProcessing ? 'Processing Payment...' : error ? 'Payment Error' : 'Payment Successful!'}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {isProcessing && (
            <p className="text-muted-foreground">
              Please wait while we verify your payment...
            </p>
          )}

          {error && (
            <div className="space-y-2">
              <p className="text-destructive">{error}</p>
              <Button onClick={handleReturnHome} variant="outline" className="w-full">
                Return to Homepage
              </Button>
            </div>
          )}

          {isCompleted && !error && (
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Your tokens have been added to your account. You can now continue using AI agents.
              </p>
              <Button onClick={handleReturnHome} className="w-full">
                Continue to Chat
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Success;
