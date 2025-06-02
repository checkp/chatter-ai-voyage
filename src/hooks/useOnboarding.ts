
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { User } from '@supabase/supabase-js';

export const useOnboarding = (user: User | null) => {
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchOnboardingStatus = async () => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('has_completed_onboarding')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching onboarding status:', error);
          setHasCompletedOnboarding(true); // Default to completed to avoid blocking
        } else {
          setHasCompletedOnboarding(data?.has_completed_onboarding ?? false);
        }
      } catch (error) {
        console.error('Error in fetchOnboardingStatus:', error);
        setHasCompletedOnboarding(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOnboardingStatus();
  }, [user?.id]);

  const completeOnboarding = async () => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ has_completed_onboarding: true })
        .eq('id', user.id);

      if (error) {
        console.error('Error completing onboarding:', error);
        toast.error('Failed to save onboarding progress');
        return;
      }

      setHasCompletedOnboarding(true);
      console.log('Onboarding completed successfully');
    } catch (error) {
      console.error('Error in completeOnboarding:', error);
      toast.error('Failed to complete onboarding');
    }
  };

  const skipOnboarding = async () => {
    await completeOnboarding();
  };

  return {
    hasCompletedOnboarding,
    isLoading,
    completeOnboarding,
    skipOnboarding
  };
};
