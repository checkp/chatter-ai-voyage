
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface TokenBalance {
  balance: number;
  total_purchased: number;
  total_consumed: number;
}

interface TokenTransaction {
  id: string;
  transaction_type: string;
  amount: number;
  balance_after: number;
  description: string;
  metadata: any;
  created_at: string;
}

export const useSecureTokens = (user: SupabaseUser | null) => {
  const queryClient = useQueryClient();

  // Fetch user token balance with enhanced security
  const { data: tokenBalance, isLoading: isLoadingBalance } = useQuery({
    queryKey: ['secure-tokens', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      // Use RLS-protected query - user can only see their own data
      const { data, error } = await supabase
        .from('user_tokens')
        .select('balance, total_purchased, total_consumed')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching token balance:', error);
        return { balance: 0, total_purchased: 0, total_consumed: 0 };
      }

      return data as TokenBalance;
    },
    enabled: !!user,
    // Refetch every 30 seconds to detect unauthorized changes
    refetchInterval: 30000,
  });

  // Fetch token transaction history with enhanced security
  const { data: transactions, isLoading: isLoadingTransactions } = useQuery({
    queryKey: ['secure-token-transactions', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      // Use RLS-protected query - user can only see their own transactions
      const { data, error } = await supabase
        .from('token_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching token transactions:', error);
        return [];
      }

      return data as TokenTransaction[];
    },
    enabled: !!user,
  });

  // Secure token validation function
  const validateTokenOperation = async (requiredTokens: number): Promise<boolean> => {
    if (!user || !tokenBalance) {
      console.error('Token validation failed: No user or balance data');
      return false;
    }
    
    // Check if user has sufficient tokens
    if (tokenBalance.balance < requiredTokens) {
      toast.error('Insufficient tokens for this request');
      return false;
    }

    // Additional server-side validation will happen in edge functions
    return true;
  };

  // Monitor for suspicious token changes
  useEffect(() => {
    if (tokenBalance && transactions && transactions.length > 0) {
      const latestTransaction = transactions[0];
      const timeDiff = Date.now() - new Date(latestTransaction.created_at).getTime();
      
      // If there's a recent large deduction without a corresponding API call, flag it
      if (timeDiff < 60000 && // Within last minute
          latestTransaction.transaction_type === 'consumption' && 
          Math.abs(latestTransaction.amount) > 100 && // Large deduction
          !latestTransaction.metadata?.platform) { // No platform metadata
        console.warn('Suspicious token transaction detected:', latestTransaction);
        toast.warning('Unusual token activity detected. Please review your account.');
      }
    }
  }, [tokenBalance, transactions]);

  return {
    tokenBalance,
    transactions,
    isLoadingBalance,
    isLoadingTransactions,
    validateTokenOperation,
  };
};
