
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';
import { toast } from 'sonner';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { TokenBalance } from '@/types/tokens';

export const useTokenBalance = (user: SupabaseUser | null) => {
  const { data: tokenBalance, isLoading: isLoadingBalance, error: tokenError } = useQuery({
    queryKey: ['tokens', user?.id],
    queryFn: async () => {
      if (!user) {
        console.log('useTokenBalance: No user provided');
        return null;
      }
      
      console.log('useTokenBalance: Fetching tokens for user:', user.id);
      
      try {
        // First try to fetch the user's token record
        const { data: tokenRecord, error: selectError } = await supabase
          .from('user_tokens')
          .select('balance, total_purchased, total_consumed')
          .eq('user_id', user.id)
          .single();

        console.log('useTokenBalance: Query result:', { tokenRecord, selectError });

        if (selectError) {
          console.error('useTokenBalance: Error fetching token record:', selectError);
          
          // If no record found (PGRST116), try to create one
          if (selectError.code === 'PGRST116') {
            console.log('useTokenBalance: No token record found, creating one');
            
            const { data: newRecord, error: insertError } = await supabase
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
              console.error('useTokenBalance: Error creating token record:', insertError);
              return { balance: 0, total_purchased: 0, total_consumed: 0 };
            }

            console.log('useTokenBalance: Created new token record:', newRecord);
            return newRecord as TokenBalance;
          }
          
          return { balance: 0, total_purchased: 0, total_consumed: 0 };
        }

        console.log('useTokenBalance: Token record found:', tokenRecord);
        return tokenRecord as TokenBalance;
      } catch (error) {
        console.error('useTokenBalance: Unexpected error:', error);
        return { balance: 0, total_purchased: 0, total_consumed: 0 };
      }
    },
    enabled: !!user,
    staleTime: 30000,
    gcTime: 60000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
    retry: (failureCount, error) => {
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
      console.error('useTokenBalance: Token query error:', tokenError);
    }
  }, [tokenError]);

  return {
    tokenBalance,
    isLoadingBalance,
    tokenError
  };
};
