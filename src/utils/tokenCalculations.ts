
import { supabase } from '@/integrations/supabase/client';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { TokenBalance } from '@/types/tokens';

// Check if user has sufficient tokens
export const checkTokenBalance = async (
  user: SupabaseUser | null, 
  tokenBalance: TokenBalance | null, 
  requiredTokens: number
): Promise<boolean> => {
  if (!user || !tokenBalance) return false;
  return tokenBalance.balance >= requiredTokens;
};

// Calculate token cost for enabled platforms
export const calculateTokenCost = async (enabledPlatforms: any[]): Promise<number> => {
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
