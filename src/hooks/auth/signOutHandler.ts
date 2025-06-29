
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cleanupAuthState } from './authStateCleanup';

export const handleSignOut = async () => {
  try {
    console.log('handleSignOut: Starting sign out process');
    
    // Clean up auth state first
    cleanupAuthState();
    
    // Attempt global sign out
    try {
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error) {
        console.error('handleSignOut: Sign out error:', error);
      }
    } catch (err) {
      console.log('handleSignOut: Sign out attempt completed');
    }
    
    // Force page redirect for clean state
    window.location.href = '/auth';
  } catch (error: any) {
    console.error('handleSignOut: Unexpected error:', error);
    toast.error('Error signing out: ' + error.message);
    // Still redirect even if there's an error
    window.location.href = '/auth';
  }
};
