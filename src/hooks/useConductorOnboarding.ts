
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

export const useConductorOnboarding = (user: User | null) => {
  const [hasSeenConductorOnboarding, setHasSeenConductorOnboarding] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchConductorOnboardingStatus = async () => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('has_seen_conductor_onboarding')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching conductor onboarding status:', error);
          setHasSeenConductorOnboarding(false);
        } else {
          setHasSeenConductorOnboarding(data?.has_seen_conductor_onboarding ?? false);
        }
      } catch (error) {
        console.error('Error in fetchConductorOnboardingStatus:', error);
        setHasSeenConductorOnboarding(false);
      } finally {
        setIsLoading(false);
      }
    };

    fetchConductorOnboardingStatus();
  }, [user?.id]);

  const completeConductorOnboarding = async () => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ has_seen_conductor_onboarding: true })
        .eq('id', user.id);

      if (error) {
        console.error('Error completing conductor onboarding:', error);
        return;
      }

      setHasSeenConductorOnboarding(true);
    } catch (error) {
      console.error('Error in completeConductorOnboarding:', error);
    }
  };

  return {
    hasSeenConductorOnboarding,
    isLoading,
    completeConductorOnboarding
  };
};
