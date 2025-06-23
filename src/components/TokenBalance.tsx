
import React, { memo, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Coins, Plus, Gift } from 'lucide-react';
import { useTokens } from '@/hooks/useTokens';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface TokenBalanceProps {
  user: SupabaseUser;
  onPurchaseClick?: () => void;
}

const TokenBalance: React.FC<TokenBalanceProps> = memo(({ user, onPurchaseClick }) => {
  const { tokenBalance, isLoadingBalance } = useTokens(user);

  // Memoize the balance calculations to prevent unnecessary re-renders
  const balanceInfo = useMemo(() => {
    if (!tokenBalance) return null;
    
    const balance = tokenBalance.balance ?? 0;
    const isLowBalance = balance < 50;
    const isNearDailyLimit = balance >= 700;
    
    return { balance, isLowBalance, isNearDailyLimit };
  }, [tokenBalance?.balance]);

  // Only log when there are actual changes, not on every render
  const loggedBalance = useMemo(() => {
    if (balanceInfo) {
      console.log('TokenBalance: Balance updated:', { 
        balance: balanceInfo.balance, 
        user: user?.id,
        isLoadingBalance,
        hasTokenBalance: !!tokenBalance 
      });
    }
    return balanceInfo?.balance;
  }, [balanceInfo?.balance, user?.id, isLoadingBalance, tokenBalance]);

  if (isLoadingBalance) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1">
            <Coins className="w-4 h-4 text-muted-foreground" />
            <div className="w-8 h-4 bg-muted animate-pulse rounded" />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Loading token balance...</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  // Handle the case where tokenBalance is null (user not found or error)
  if (!tokenBalance || !balanceInfo) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1">
            <Coins className="w-4 h-4 text-orange-500" />
            <Badge variant="destructive" className="text-xs">
              !
            </Badge>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Error loading token balance</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  const { balance, isLowBalance, isNearDailyLimit } = balanceInfo;

  const handleClick = () => {
    if (onPurchaseClick) {
      onPurchaseClick();
    }
  };

  return (
    <div className="flex items-center gap-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1 cursor-pointer" onClick={handleClick}>
            <div className="flex items-center">
              <Coins className={`w-4 h-4 ${isLowBalance ? 'text-orange-500' : 'text-muted-foreground'}`} />
              {isNearDailyLimit && (
                <Gift className="w-3 h-3 text-green-500 -ml-1" />
              )}
            </div>
            <Badge 
              variant={isLowBalance ? 'destructive' : 'secondary'}
              className="text-xs font-mono hover:bg-opacity-80 transition-colors"
            >
              {balance.toLocaleString()}
            </Badge>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-center">
            <p className="font-medium">{balance.toLocaleString()} tokens available</p>
            <p className="text-xs text-muted-foreground">
              You receive 300 free tokens daily (max: 1000)
            </p>
            {isLowBalance && (
              <p className="text-xs text-orange-500 mt-1">Low balance - click to buy more</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
      
      {isLowBalance && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="outline"
              onClick={handleClick}
              className="h-6 w-6"
            >
              <Plus className="w-3 h-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Buy more tokens</p>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
});

TokenBalance.displayName = 'TokenBalance';

export default TokenBalance;
