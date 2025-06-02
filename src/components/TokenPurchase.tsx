
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Coins, Zap, CreditCard } from 'lucide-react';
import { useTokens } from '@/hooks/useTokens';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import PayPalPurchaseButton from './PayPalPurchaseButton';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface TokenPurchaseProps {
  user: SupabaseUser;
}

const TokenPurchase: React.FC<TokenPurchaseProps> = ({ user }) => {
  const { packages, isLoadingPackages } = useTokens(user);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'stripe' | 'paypal'>('stripe');

  const handleStripePurchase = async (packageId: string) => {
    try {
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
        window.open(response.data.url, '_blank');
      }
    } catch (error: any) {
      console.error('Stripe purchase error:', error);
      toast.error('Failed to start Stripe purchase: ' + error.message);
    }
  };

  if (isLoadingPackages) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-muted rounded" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-8 bg-muted rounded" />
                <div className="h-4 bg-muted rounded" />
                <div className="h-10 bg-muted rounded" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Purchase Tokens</h2>
        <p className="text-muted-foreground">
          Choose a token package and payment method to continue using AI agents
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {packages?.map((pkg) => {
          const effectiveTokens = pkg.tokens + Math.floor(pkg.tokens * pkg.bonus_percentage / 100);
          const pricePerToken = pkg.price_cents / effectiveTokens;

          return (
            <Card key={pkg.id} className={`relative ${pkg.name.includes('Popular') ? 'border-primary shadow-lg' : ''}`}>
              {pkg.name.includes('Popular') && (
                <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                  Most Popular
                </Badge>
              )}
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Coins className="w-5 h-5" />
                  {pkg.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-2xl font-bold">
                    ${(pkg.price_cents / 100).toFixed(2)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {pkg.tokens.toLocaleString()} tokens
                  </div>
                  {pkg.bonus_percentage > 0 && (
                    <div className="flex items-center gap-1 text-green-600">
                      <Zap className="w-3 h-3" />
                      <span className="text-xs font-medium">
                        +{pkg.bonus_percentage}% bonus ({Math.floor(pkg.tokens * pkg.bonus_percentage / 100).toLocaleString()} free)
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="text-xs text-muted-foreground">
                  {(pricePerToken / 100).toFixed(4)}¢ per token
                </div>

                <Tabs value={selectedPaymentMethod} onValueChange={(value) => setSelectedPaymentMethod(value as 'stripe' | 'paypal')} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-3">
                    <TabsTrigger value="stripe" className="text-xs">
                      <CreditCard className="w-3 h-3 mr-1" />
                      Card
                    </TabsTrigger>
                    <TabsTrigger value="paypal" className="text-xs">
                      PayPal
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="stripe">
                    <Button 
                      onClick={() => handleStripePurchase(pkg.id)}
                      className="w-full"
                      variant={pkg.name.includes('Popular') ? 'default' : 'outline'}
                    >
                      Purchase with Card
                    </Button>
                  </TabsContent>
                  
                  <TabsContent value="paypal">
                    <PayPalPurchaseButton
                      packageId={pkg.id}
                      packageName={pkg.name}
                    />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default TokenPurchase;
