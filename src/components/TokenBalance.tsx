
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Coins, Plus, RefreshCw } from 'lucide-react';
import { useTokens } from '@/hooks/useTokens';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface TokenBalanceProps {
  user: SupabaseUser;
  onPurchaseClick?: () => void;
}

const TokenBalance: React.FC<TokenBalanceProps> = ({ user, onPurchaseClick }) => {
  const { tokenBalance, isLoadingBalance } = useTokens(user);

  console.log('TokenBalance rendering:', { 
    balance: tokenBalance?.balance, 
    tokenBalance, 
    user: user?.id,
    isLoadingBalance 
  });

  if (isLoadingBalance) {
    return (
      <div className="flex items-center gap-2">
        <Coins className="w-4 h-4 text-muted-foreground" />
        <div className="w-12 h-5 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  const balance = tokenBalance?.balance ?? 0;
  const isLowBalance = balance < 50;

  const handleClick = () => {
    if (onPurchaseClick) {
      onPurchaseClick();
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Coins className={`w-4 h-4 ${isLowBalance ? 'text-orange-500' : 'text-muted-foreground'}`} />
      <Badge 
        variant={isLowBalance ? 'destructive' : 'secondary'}
        className="font-mono cursor-pointer hover:bg-opacity-80 transition-colors"
        onClick={handleClick}
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
};

export default TokenBalance;
