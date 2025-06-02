
import React, { useEffect, useState } from 'react';
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

  const paymentMethod = searchParams.get('payment_method');
  const orderId = searchParams.get('token'); // PayPal order ID
  const sessionId = searchParams.get('session_id'); // Stripe session ID

  useEffect(() => {
    const processPayment = async () => {
      if (isCompleted || isProcessing) return;

      setIsProcessing(true);

      try {
        if (paymentMethod === 'paypal' && orderId) {
          // Process PayPal payment
          const response = await supabase.functions.invoke('capture-paypal-payment', {
            body: { orderId },
            headers: {
              Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            },
          });

          if (response.error) {
            throw new Error(response.error.message || 'Failed to process PayPal payment');
          }

          if (response.data?.success) {
            setIsCompleted(true);
            toast.success(`Successfully added ${response.data.tokensAdded} tokens to your account!`);
          }
        } else if (sessionId) {
          // For Stripe, the payment is already processed via webhooks or the existing flow
          setIsCompleted(true);
          toast.success('Payment processed successfully!');
        } else {
          setError('Invalid payment parameters');
        }
      } catch (error: any) {
        console.error('Payment processing error:', error);
        setError(error.message);
        toast.error('Failed to process payment: ' + error.message);
      } finally {
        setIsProcessing(false);
      }
    };

    processPayment();
  }, [paymentMethod, orderId, sessionId, isCompleted, isProcessing]);

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
              Please wait while we process your {paymentMethod === 'paypal' ? 'PayPal' : 'Stripe'} payment...
            </p>
          )}
          
          {error && (
            <div className="space-y-2">
              <p className="text-destructive">{error}</p>
              <Button 
                onClick={handleReturnHome}
                variant="outline"
                className="w-full"
              >
                Return to Homepage
              </Button>
            </div>
          )}
          
          {isCompleted && !error && (
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Your tokens have been added to your account. You can now continue using AI agents.
              </p>
              <Button 
                onClick={handleReturnHome}
                className="w-full"
              >
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
