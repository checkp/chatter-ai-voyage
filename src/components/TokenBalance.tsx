
import React, { memo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Coins, Plus, RefreshCw, Gift } from 'lucide-react';
import { useTokens } from '@/hooks/useTokens';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface TokenBalanceProps {
  user: SupabaseUser;
  onPurchaseClick?: () => void;
}

const TokenBalance: React.FC<TokenBalanceProps> = memo(({ user, onPurchaseClick }) => {
  const { tokenBalance, isLoadingBalance } = useTokens(user);

  console.log('TokenBalance rendering:', { 
    balance: tokenBalance?.balance, 
    user: user?.id,
    isLoadingBalance,
    hasTokenBalance: !!tokenBalance 
  });

  if (isLoadingBalance) {
    return (
      <div className="flex items-center gap-2">
        <Coins className="w-4 h-4 text-muted-foreground" />
        <div className="w-12 h-5 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  // Handle the case where tokenBalance is null (user not found or error)
  if (!tokenBalance) {
    console.log('TokenBalance: No token balance data available');
    return (
      <div className="flex items-center gap-2">
        <Coins className="w-4 h-4 text-orange-500" />
        <Badge variant="destructive" className="font-mono">
          Error loading tokens
        </Badge>
      </div>
    );
  }

  const balance = tokenBalance.balance ?? 0;
  const isLowBalance = balance < 50;
  const isNearDailyLimit = balance >= 700; // Close to the 1000 daily limit

  console.log('TokenBalance: Final balance calculation:', { 
    rawBalance: tokenBalance.balance, 
    finalBalance: balance,
    isLowBalance,
    isNearDailyLimit
  });

  const handleClick = () => {
    if (onPurchaseClick) {
      onPurchaseClick();
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        <Coins className={`w-4 h-4 ${isLowBalance ? 'text-orange-500' : 'text-muted-foreground'}`} />
        {isNearDailyLimit && (
          <Gift className="w-3 h-3 text-green-500" />
        )}
      </div>
      <Badge 
        variant={isLowBalance ? 'destructive' : 'secondary'}
        className="font-mono cursor-pointer hover:bg-opacity-80 transition-colors"
        onClick={handleClick}
        title={`You receive 300 free tokens daily (max balance: 1000)`}
      >
        {balance.toLocaleString()} tokens
      </Badge>
      {isLowBalance && (
        <Button
          size="sm"
          variant="outline"
          onClick={handleClick}
          className="flex items-center gap-1"
        >
          <Plus className="w-3 h-3" />
          Buy
        </Button>
      )}
    </div>
  );
});

TokenBalance.displayName = 'TokenBalance';

export default TokenBalance;
