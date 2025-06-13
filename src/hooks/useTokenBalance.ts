
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
      
      // Check if user is authenticated with Supabase
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log('useTokenBalance: Current session:', { 
        hasSession: !!session, 
        userId: session?.user?.id, 
        sessionError 
      });
      
      if (!session || session.user.id !== user.id) {
        console.error('useTokenBalance: User not properly authenticated');
        throw new Error('User not authenticated');
      }
      
      try {
        // Simply fetch the user's token record - don't create or handle duplicates here
        const { data: tokenRecord, error: selectError } = await supabase
          .from('user_tokens')
          .select('balance, total_purchased, total_consumed')
          .eq('user_id', user.id)
          .single();

        console.log('useTokenBalance: Query result:', { tokenRecord, selectError });

        if (selectError) {
          console.error('useTokenBalance: Error fetching token record:', selectError);
          
          // If it's a 403 error, the user might not be properly authenticated
          if (selectError.code === 'PGRST301') {
            throw new Error('Access denied - user not authenticated');
          }
          
          // If no record found, return default values - let useAuth handle creation
          if (selectError.code === 'PGRST116') {
            console.log('useTokenBalance: No token record found, returning defaults');
            return { balance: 0, total_purchased: 0, total_consumed: 0 };
          }
          
          return { balance: 0, total_purchased: 0, total_consumed: 0 };
        }

        console.log('useTokenBalance: Token record found:', tokenRecord);
        return tokenRecord as TokenBalance;
      } catch (error) {
        console.error('useTokenBalance: Unexpected error:', error);
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
      console.error('useTokenBalance: Token query error:', tokenError);
      
      // Show user-friendly error messages
      if (tokenError.message?.includes('Access denied')) {
        toast.error('Please sign in again to access your token balance');
      } else if (tokenError.message?.includes('not authenticated')) {
        toast.error('Authentication required to view tokens');
      }
    }
  }, [tokenError]);

  return {
    tokenBalance,
    isLoadingBalance,
    tokenError
  };
};
