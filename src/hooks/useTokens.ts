
import { useQueryClient } from '@tanstack/react-query';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { useTokenBalance } from './useTokenBalance';
import { useTokenTransactions } from './useTokenTransactions';
import { useTokenPackages } from './useTokenPackages';
import { checkTokenBalance, calculateTokenCost } from '@/utils/tokenCalculations';
import { useMemo, useCallback } from 'react';

export const useTokens = (user: SupabaseUser | null) => {
  const queryClient = useQueryClient();
  
  const { tokenBalance, isLoadingBalance } = useTokenBalance(user);
  const { transactions, isLoadingTransactions } = useTokenTransactions(user);
  const { packages, isLoadingPackages } = useTokenPackages();

  // Memoize the refresh function to prevent unnecessary re-renders
  const refreshTokenBalance = useCallback(() => {
    if (user?.id) {
      queryClient.invalidateQueries({ queryKey: ['tokens', user.id] });
    }
  }, [user?.id, queryClient]);

  // Memoize the wrapper function to maintain stable references
  const checkTokenBalanceWrapper = useCallback(async (requiredTokens: number): Promise<boolean> => {
    return checkTokenBalance(user, tokenBalance, requiredTokens);
  }, [user, tokenBalance]);

  // Memoize the return object to prevent unnecessary re-renders
  return useMemo(() => ({
    tokenBalance,
    transactions,
    packages,
    isLoadingBalance,
    isLoadingTransactions,
    isLoadingPackages,
    checkTokenBalance: checkTokenBalanceWrapper,
    calculateTokenCost,
    refreshTokenBalance,
  }), [
    tokenBalance,
    transactions,
    packages,
    isLoadingBalance,
    isLoadingTransactions,
    isLoadingPackages,
    checkTokenBalanceWrapper,
    refreshTokenBalance
  ]);
};
