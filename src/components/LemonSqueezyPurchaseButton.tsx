import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Lemon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  packageId: string;
  packageName: string;
  disabled?: boolean;
  hasVariant: boolean;
}

const LemonSqueezyPurchaseButton: React.FC<Props> = ({ packageId, disabled, hasVariant }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handlePurchase = async () => {
    if (!hasVariant) {
      toast.error('Lemon Squeezy not configured for this package yet.');
      return;
    }
    try {
      setIsLoading(true);
      const session = (await supabase.auth.getSession()).data.session;
      const res = await supabase.functions.invoke('create-lemonsqueezy-checkout', {
        body: { package_id: packageId },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (res.error) throw new Error(res.error.message || 'Failed to create checkout');
      if (res.data?.url) {
        window.location.href = res.data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (e: any) {
      console.error('Lemon Squeezy purchase error:', e);
      toast.error('Checkout failed: ' + e.message);
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handlePurchase}
      disabled={disabled || isLoading || !hasVariant}
      variant="outline"
      className="w-full"
      title={!hasVariant ? 'Not configured yet' : ''}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Redirecting...
        </>
      ) : (
        <>
          <Lemon className="w-4 h-4 mr-2" />
          Pay with Lemon Squeezy
        </>
      )}
    </Button>
  );
};

export default LemonSqueezyPurchaseButton;
