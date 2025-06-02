
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PayPalPurchaseButtonProps {
  packageId: string;
  packageName: string;
  disabled?: boolean;
}

const PayPalPurchaseButton: React.FC<PayPalPurchaseButtonProps> = ({ 
  packageId, 
  packageName, 
  disabled = false 
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handlePayPalPurchase = async () => {
    try {
      setIsLoading(true);
      
      const response = await supabase.functions.invoke('create-paypal-order', {
        body: { package_id: packageId },
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to create PayPal order');
      }

      if (response.data?.approvalUrl) {
        // Open PayPal in a new tab
        window.open(response.data.approvalUrl, '_blank');
      }
    } catch (error: any) {
      console.error('PayPal purchase error:', error);
      toast.error('Failed to start PayPal purchase: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button 
      onClick={handlePayPalPurchase}
      disabled={disabled || isLoading}
      className="w-full bg-[#0070ba] hover:bg-[#005ea6] text-white"
      variant="default"
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Creating Order...
        </>
      ) : (
        <>
          Pay with PayPal
        </>
      )}
    </Button>
  );
};

export default PayPalPurchaseButton;
