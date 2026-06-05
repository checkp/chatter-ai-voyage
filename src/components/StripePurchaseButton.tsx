import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, CreditCard } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface StripePurchaseButtonProps {
  packageId: string;
  packageName: string;
  disabled?: boolean;
}

const StripePurchaseButton: React.FC<StripePurchaseButtonProps> = ({
  packageId,
  disabled = false,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handlePurchase = async () => {
    try {
      setIsLoading(true);

      const response = await supabase.functions.invoke('create-token-checkout', {
        body: { package_id: packageId },
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to create checkout session');
      }

      if (response.data?.url) {
        window.location.href = response.data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error: any) {
      console.error('Stripe purchase error:', error);
      toast.error('Failed to start checkout: ' + error.message);
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handlePurchase}
      disabled={disabled || isLoading}
      className="w-full"
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Redirecting to checkout...
        </>
      ) : (
        <>
          <CreditCard className="w-4 h-4 mr-2" />
          Pay with Card
        </>
      )}
    </Button>
  );
};

export default StripePurchaseButton;
