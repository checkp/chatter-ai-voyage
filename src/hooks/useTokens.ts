
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

  // Fetch user token balance with enhanced debugging
  const { data: tokenBalance, isLoading: isLoadingBalance, error: tokenError } = useQuery({
    queryKey: ['tokens', user?.id],
    queryFn: async () => {
      if (!user) {
        console.log('useTokens: No user provided');
        return null;
      }
      
      console.log('useTokens: Fetching tokens for user:', user.id);
      
      const { data, error } = await supabase
        .from('user_tokens')
        .select('balance, total_purchased, total_consumed')
        .eq('user_id', user.id)
        .single();

      console.log('useTokens: Query result:', { data, error });

      if (error) {
        console.error('useTokens: Error fetching token balance:', error);
        
        // If no record found, try to create one with retry logic
        if (error.code === 'PGRST116') {
          console.log('useTokens: No token record found, attempting to create...');
          
          // Wait a bit and try again first (in case record is being created)
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const { data: retryData, error: retryError } = await supabase
            .from('user_tokens')
            .select('balance, total_purchased, total_consumed')
            .eq('user_id', user.id)
            .single();
            
          if (!retryError && retryData) {
            console.log('useTokens: Found tokens on retry:', retryData);
            return retryData as TokenBalance;
          }
          
          console.log('useTokens: Still no record, creating initial balance...');
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
            console.error('useTokens: Error creating initial token balance:', insertError);
            return { balance: 0, total_purchased: 0, total_consumed: 0 };
          }
          
          console.log('useTokens: Created initial token balance:', insertData);
          return insertData as TokenBalance;
        }
        
        return { balance: 0, total_purchased: 0, total_consumed: 0 };
      }

      console.log('useTokens: Token balance fetched successfully:', data);
      return data as TokenBalance;
    },
    enabled: !!user,
    staleTime: 10000, // Reduced to 10 seconds for better responsiveness
    refetchOnWindowFocus: true,
    retry: 3, // Add retry logic
    retryDelay: 1000, // Wait 1 second between retries
  });

  // Log any token errors
  useEffect(() => {
    if (tokenError) {
      console.error('useTokens: Token query error:', tokenError);
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
