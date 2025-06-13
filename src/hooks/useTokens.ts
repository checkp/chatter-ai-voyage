
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

interface TokenPackage {
  id: string;
  name: string;
  tokens: number;
  price_cents: number;
  bonus_percentage: number;
  is_active: boolean;
  sort_order: number;
}

export const useTokens = (user: SupabaseUser | null) => {
  const queryClient = useQueryClient();

  // Fetch user token balance with optimized settings to reduce requests
  const { data: tokenBalance, isLoading: isLoadingBalance, error: tokenError } = useQuery({
    queryKey: ['tokens', user?.id],
    queryFn: async () => {
      if (!user) {
        console.log('useTokens: No user provided');
        return null;
      }
      
      console.log('useTokens: Fetching tokens for user:', user.id);
      
      // Check if user is authenticated with Supabase
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log('useTokens: Current session:', { 
        hasSession: !!session, 
        userId: session?.user?.id, 
        sessionError 
      });
      
      if (!session || session.user.id !== user.id) {
        console.error('useTokens: User not properly authenticated');
        throw new Error('User not authenticated');
      }
      
      try {
        // Simply fetch the user's token record - don't create or handle duplicates here
        const { data: tokenRecord, error: selectError } = await supabase
          .from('user_tokens')
          .select('balance, total_purchased, total_consumed')
          .eq('user_id', user.id)
          .single();

        console.log('useTokens: Query result:', { tokenRecord, selectError });

        if (selectError) {
          console.error('useTokens: Error fetching token record:', selectError);
          
          // If it's a 403 error, the user might not be properly authenticated
          if (selectError.code === 'PGRST301') {
            throw new Error('Access denied - user not authenticated');
          }
          
          // If no record found, return default values - let useAuth handle creation
          if (selectError.code === 'PGRST116') {
            console.log('useTokens: No token record found, returning defaults');
            return { balance: 0, total_purchased: 0, total_consumed: 0 };
          }
          
          return { balance: 0, total_purchased: 0, total_consumed: 0 };
        }

        console.log('useTokens: Token record found:', tokenRecord);
        return tokenRecord as TokenBalance;
      } catch (error) {
        console.error('useTokens: Unexpected error:', error);
        throw error;
      }
    },
    enabled: !!user,
    staleTime: 30000, // Increased from 5 seconds to 30 seconds
    gcTime: 60000, // Cache for 1 minute
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnMount: false, // Don't refetch on component mount if data exists
    refetchInterval: false, // Disable automatic refetching
    retry: (failureCount, error) => {
      // Don't retry on authentication errors
      if (error?.message?.includes('Access denied') || error?.message?.includes('not authenticated')) {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: 500,
  });

  // Log any token errors with more detail
  useEffect(() => {
    if (tokenError) {
      console.error('useTokens: Token query error:', tokenError);
      
      // Show user-friendly error messages
      if (tokenError.message?.includes('Access denied')) {
        toast.error('Please sign in again to access your token balance');
      } else if (tokenError.message?.includes('not authenticated')) {
        toast.error('Authentication required to view tokens');
      }
    }
  }, [tokenError]);

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
    staleTime: 60000, // Cache for 1 minute
    refetchOnWindowFocus: false,
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

  // Fetch available token packages (public read access)
  const { data: packages, isLoading: isLoadingPackages } = useQuery({
    queryKey: ['token-packages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('token_packages')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (error) {
        console.error('Error fetching token packages:', error);
        return [];
      }

      return data as TokenPackage[];
    },
    staleTime: 300000, // Cache for 5 minutes
    refetchOnWindowFocus: false,
  });

  // Check if user has sufficient tokens
  const checkTokenBalance = async (requiredTokens: number): Promise<boolean> => {
    if (!user || !tokenBalance) return false;
    return tokenBalance.balance >= requiredTokens;
  };

  // Calculate token cost for enabled platforms
  const calculateTokenCost = async (enabledPlatforms: any[]): Promise<number> => {
    if (!enabledPlatforms.length) return 0;

    const { data: pricing, error } = await supabase
      .from('model_pricing')
      .select('platform, model_id, tokens_per_message')
      .in('platform', enabledPlatforms.map(p => p.id));

    if (error) {
      console.error('Error fetching token pricing:', error);
      return 0;
    }

    let totalCost = 0;
    enabledPlatforms.forEach(platform => {
      const platformPricing = pricing?.find(p => 
        p.platform === platform.id && p.model_id === platform.selectedModel
      );
      if (platformPricing) {
        totalCost += platformPricing.tokens_per_message;
      }
    });

    return totalCost;
  };

  // Function to manually refresh token balance (call this after sending messages)
  const refreshTokenBalance = () => {
    queryClient.invalidateQueries({ queryKey: ['tokens', user?.id] });
  };

  return {
    tokenBalance,
    transactions,
    packages,
    isLoadingBalance,
    isLoadingTransactions,
    isLoadingPackages,
    checkTokenBalance,
    calculateTokenCost,
    refreshTokenBalance,
  };
};
