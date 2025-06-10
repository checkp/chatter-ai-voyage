
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';

export const useAuth = () => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const cleanupAuthState = () => {
    // Remove all auth-related keys from localStorage
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        localStorage.removeItem(key);
      }
    });
    
    // Remove from sessionStorage if in use
    Object.keys(sessionStorage || {}).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        sessionStorage.removeItem(key);
      }
    });
  };

  const ensureUserTokens = async (userId: string) => {
    try {
      // Use upsert with ON CONFLICT to prevent duplicates
      const { error } = await supabase
        .from('user_tokens')
        .upsert({
          user_id: userId,
          balance: 300,
          total_purchased: 0,
          total_consumed: 0
        }, {
          onConflict: 'user_id',
          ignoreDuplicates: true
        });

      if (error) {
        console.error('Error ensuring user tokens:', error);
      } else {
        console.log('Successfully ensured token balance for user:', userId);
      }
    } catch (error) {
      console.error('Error ensuring user tokens:', error);
    }
  };

  const ensureUserProfile = async (user: SupabaseUser) => {
    try {
      // Check if user profile exists
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (fetchError && fetchError.code === 'PGRST116') {
        // No profile found, create one
        console.log('Creating user profile for:', user.email);
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
            avatar_url: user.user_metadata?.avatar_url || null,
            has_completed_onboarding: false // New users should see the welcome screen
          });

        if (insertError) {
          console.error('Error creating user profile:', insertError);
        } else {
          console.log('Successfully created user profile');
        }
      }
    } catch (error) {
      console.error('Error ensuring user profile:', error);
    }
  };

  const ensureDefaultAgentSettings = async (userId: string) => {
    try {
      // Check if user already has agent settings
      const { data: existingSettings, error: fetchError } = await supabase
        .from('user_agent_settings')
        .select('*')
        .eq('user_id', userId);

      if (fetchError) {
        console.error('Error checking agent settings:', fetchError);
        return;
      }

      // Enable all 4 platforms by default with centralized API keys
      const defaultPlatforms = [
        { platform: 'openai', model: 'gpt-4o-mini', enabled: true },
        { platform: 'anthropic', model: 'claude-3-5-haiku-20241022', enabled: true },
        { platform: 'deepseek', model: 'deepseek-chat', enabled: true },
        { platform: 'grok', model: 'grok-3', enabled: true }
      ];
      
      const settingsToInsert = [];

      for (const { platform, model, enabled } of defaultPlatforms) {
        const existingSetting = existingSettings?.find(s => s.platform === platform);
        if (!existingSetting) {
          settingsToInsert.push({
            user_id: userId,
            platform: platform,
            enabled: enabled,
            model: model
          });
        }
      }

      if (settingsToInsert.length > 0) {
        console.log('Creating default agent settings for new user:', userId, settingsToInsert);
        const { error: insertError } = await supabase
          .from('user_agent_settings')
          .insert(settingsToInsert);

        if (insertError) {
          console.error('Error creating default agent settings:', insertError);
        } else {
          console.log('Successfully created default agent settings - all 4 platforms enabled by default');
        }
      } else {
        console.log('User already has agent settings configured');
      }
    } catch (error) {
      console.error('Error ensuring default agent settings:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      console.log('Signing out user...');
      
      // Clean up auth state first
      cleanupAuthState();
      
      // Attempt global sign out
      try {
        const { error } = await supabase.auth.signOut({ scope: 'global' });
        if (error) {
          console.error('Sign out error:', error);
        }
      } catch (err) {
        console.log('Sign out attempt completed');
      }
      
      // Force page redirect for clean state
      window.location.href = '/auth';
    } catch (error: any) {
      console.error('Error during sign out:', error);
      toast.error('Error signing out: ' + error.message);
      // Still redirect even if there's an error
      window.location.href = '/auth';
    }
  };

  useEffect(() => {
    let mounted = true;

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        console.log('Auth state change:', event, session?.user?.email);
        
        // Update state synchronously
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        if (event === 'SIGNED_IN' && session?.user) {
          console.log('User signed in successfully:', session.user.email);
          
          // Defer additional setup to prevent deadlocks
          setTimeout(async () => {
            if (mounted) {
              await ensureUserProfile(session.user);
              await ensureUserTokens(session.user.id);
              await ensureDefaultAgentSettings(session.user.id);
              
              if (window.location.pathname === '/auth') {
                console.log('Redirecting from auth page to main app');
                window.location.href = '/';
              }
            }
          }, 100);
        }
        
        if (event === 'SIGNED_OUT') {
          console.log('User signed out');
          // Clean up any remaining auth state
          cleanupAuthState();
          
          // Only redirect if we're not already on auth page
          if (window.location.pathname !== '/auth') {
            console.log('Redirecting to auth page');
            window.location.href = '/auth';
          }
        }

        if (event === 'TOKEN_REFRESHED') {
          console.log('Token refreshed for user:', session?.user?.email);
        }
      }
    );

    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Error getting initial session:', error);
          // Clean up potentially corrupted auth state
          cleanupAuthState();
        }
        
        if (mounted) {
          console.log('Initial session check:', session?.user?.email);
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);

          // Ensure user setup for existing sessions
          if (session?.user) {
            await ensureUserProfile(session.user);
            await ensureUserTokens(session.user.id);
            await ensureDefaultAgentSettings(session.user.id);
          }
        }
      } catch (error) {
        console.error('Error during initial session check:', error);
        if (mounted) {
          setLoading(false);
          cleanupAuthState();
        }
      }
    };

    getInitialSession();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return { user, session, loading, handleSignOut };
};
