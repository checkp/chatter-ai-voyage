
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';
import { toast } from 'sonner';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { TokenTransaction } from '@/types/tokens';

export const useTokenTransactions = (user: SupabaseUser | null) => {
  // Fetch token transaction history with RLS protection
  const { data: transactions, isLoading: isLoadingTransactions } = useQuery({
    queryKey: ['token-transactions', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
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
    staleTime: 120000, // Cache for 2 minutes
    refetchOnWindowFocus: false,
    refetchInterval: false, // Disable automatic refetching
    retry: (failureCount, error) => {
      // Don't retry on auth errors or recursion errors
      if (error?.message?.includes('Access denied') || 
          error?.message?.includes('not authenticated') ||
          error?.message?.includes('infinite recursion')) {
        return false;
      }
      return failureCount < 1;
    },
  });

  // Check for recent daily token bonus and show notification
  useEffect(() => {
    if (transactions && transactions.length > 0) {
      const latestTransaction = transactions[0];
      const isRecentDailyBonus = 
        latestTransaction.transaction_type === 'daily_bonus' && 
        new Date(latestTransaction.created_at).getTime() > Date.now() - 24 * 60 * 60 * 1000; // Within last 24 hours
      
      if (isRecentDailyBonus && latestTransaction.amount > 0) {
        const timeSinceBonus = Date.now() - new Date(latestTransaction.created_at).getTime();
        if (timeSinceBonus < 60 * 1000) { // Show notification only if bonus was very recent (within 1 minute)
          toast.success(`You received ${latestTransaction.amount} daily free tokens! 🎉`);
        }
      }
    }
  }, [transactions]);

  return {
    transactions,
    isLoadingTransactions
  };
};
