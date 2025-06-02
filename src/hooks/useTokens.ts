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

  // Fetch user token balance with enhanced debugging and duplicate handling
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
        // First, get all token records for this user to check for duplicates
        const { data: allRecords, error: selectError } = await supabase
          .from('user_tokens')
          .select('id, balance, total_purchased, total_consumed, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true }); // Get oldest first

        console.log('useTokens: Query result:', { allRecords, selectError });

        if (selectError) {
          console.error('useTokens: Error fetching token records:', selectError);
          
          // If it's a 403 error, the user might not be properly authenticated
          if (selectError.code === 'PGRST301') {
            throw new Error('Access denied - user not authenticated');
          }
          
          return { balance: 0, total_purchased: 0, total_consumed: 0 };
        }

        // If no records found, create initial record
        if (!allRecords || allRecords.length === 0) {
          console.log('useTokens: No token records found, creating initial record');
          
          const { data: insertData, error: insertError } = await supabase
            .from('user_tokens')
            .insert({
              user_id: user.id,
              balance: 300,
              total_purchased: 0,
              total_consumed: 0
            })
            .select('balance, total_purchased, total_consumed')
            .single();

          if (insertError) {
            console.error('useTokens: Error creating token record:', insertError);
            if (insertError.code === 'PGRST301') {
              throw new Error('Access denied - cannot create token record');
            }
            return { balance: 0, total_purchased: 0, total_consumed: 0 };
          }
          
          console.log('useTokens: Successfully created token record:', insertData);
          return insertData as TokenBalance;
        }

        // If multiple records found, clean up duplicates
        if (allRecords.length > 1) {
          console.log('useTokens: Multiple token records found, cleaning up duplicates');
          
          // Keep the first record (oldest), delete the rest
          const recordToKeep = allRecords[0];
          const recordsToDelete = allRecords.slice(1);
          
          for (const record of recordsToDelete) {
            console.log('useTokens: Deleting duplicate record:', record.id);
            const { error: deleteError } = await supabase
              .from('user_tokens')
              .delete()
              .eq('id', record.id);
              
            if (deleteError) {
              console.error('useTokens: Error deleting duplicate record:', deleteError);
            }
          }
          
          console.log('useTokens: Using record:', recordToKeep);
          return {
            balance: recordToKeep.balance,
            total_purchased: recordToKeep.total_purchased,
            total_consumed: recordToKeep.total_consumed
          } as TokenBalance;
        }

        // Single record found - normal case
        const record = allRecords[0];
        console.log('useTokens: Single token record found:', record);
        return {
          balance: record.balance,
          total_purchased: record.total_purchased,
          total_consumed: record.total_consumed
        } as TokenBalance;
      } catch (error) {
        console.error('useTokens: Unexpected error:', error);
        throw error;
      }
    },
    enabled: !!user,
    staleTime: 5000,
    refetchOnWindowFocus: true,
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
  });

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

  return {
    tokenBalance,
    transactions,
    packages,
    isLoadingBalance,
    isLoadingTransactions,
    isLoadingPackages,
    checkTokenBalance,
    calculateTokenCost,
  };
};
