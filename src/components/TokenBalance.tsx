
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Coins, Plus } from 'lucide-react';
import { useTokens } from '@/hooks/useTokens';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface TokenBalanceProps {
  user: SupabaseUser;
  onPurchaseClick?: () => void;
}

const TokenBalance: React.FC<TokenBalanceProps> = ({ user, onPurchaseClick }) => {
  const { tokenBalance, isLoadingBalance } = useTokens(user);

  if (isLoadingBalance) {
    return (
      <div className="flex items-center gap-2">
        <Coins className="w-4 h-4 text-muted-foreground" />
        <div className="w-12 h-5 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  const balance = tokenBalance?.balance || 0;
  const isLowBalance = balance < 50;

  return (
    <div className="flex items-center gap-2">
      <Coins className={`w-4 h-4 ${isLowBalance ? 'text-orange-500' : 'text-muted-foreground'}`} />
      <Badge 
        variant={isLowBalance ? 'destructive' : 'secondary'}
        className="font-mono"
      >
        {balance.toLocaleString()} tokens
      </Badge>
      {isLowBalance && onPurchaseClick && (
        <Button
          size="sm"
          variant="outline"
          onClick={onPurchaseClick}
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
