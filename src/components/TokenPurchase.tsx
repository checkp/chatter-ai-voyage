
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Coins, Zap } from 'lucide-react';
import { useTokenPackages } from '@/hooks/useTokenPackages';
import StripePurchaseButton from './StripePurchaseButton';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface TokenPurchaseProps {
  user: SupabaseUser;
}

const TokenPurchase: React.FC<TokenPurchaseProps> = ({ user }) => {
  const { packages, isLoadingPackages } = useTokenPackages();

  console.log('TokenPurchase: Loading packages:', { isLoadingPackages, packagesCount: packages?.length });

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

  if (!packages || packages.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No token packages available at the moment.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Purchase Tokens</h2>
        <p className="text-muted-foreground">
          Choose a token package to continue using AI agents
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {packages.map((pkg) => {
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

                <StripePurchaseButton
                  packageId={pkg.id}
                  packageName={pkg.name}
                />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default TokenPurchase;
