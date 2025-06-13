
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TokenPackage } from '@/types/tokens';

export const useTokenPackages = () => {
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

  return {
    packages,
    isLoadingPackages
  };
};
