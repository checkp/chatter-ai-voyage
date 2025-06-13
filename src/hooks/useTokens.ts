
import { useQueryClient } from '@tanstack/react-query';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { useTokenBalance } from './useTokenBalance';
import { useTokenTransactions } from './useTokenTransactions';
import { useTokenPackages } from './useTokenPackages';
import { checkTokenBalance, calculateTokenCost } from '@/utils/tokenCalculations';

export const useTokens = (user: SupabaseUser | null) => {
  const queryClient = useQueryClient();
  
  const { tokenBalance, isLoadingBalance } = useTokenBalance(user);
  const { transactions, isLoadingTransactions } = useTokenTransactions(user);
  const { packages, isLoadingPackages } = useTokenPackages();

  // Function to manually refresh token balance (call this after sending messages)
  const refreshTokenBalance = () => {
    queryClient.invalidateQueries({ queryKey: ['tokens', user?.id] });
  };

  // Wrapper functions to maintain the same API
  const checkTokenBalanceWrapper = async (requiredTokens: number): Promise<boolean> => {
    return checkTokenBalance(user, tokenBalance, requiredTokens);
  };

  return {
    tokenBalance,
    transactions,
    packages,
    isLoadingBalance,
    isLoadingTransactions,
    isLoadingPackages,
    checkTokenBalance: checkTokenBalanceWrapper,
    calculateTokenCost,
    refreshTokenBalance,
  };
};
