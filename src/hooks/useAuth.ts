
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
      console.log('ensureUserTokens: Starting for user:', userId);
      
      // First check if tokens already exist
      const { data: existingTokens, error: checkError } = await supabase
        .from('user_tokens')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('ensureUserTokens: Error checking existing tokens:', checkError);
        return;
      }

      if (existingTokens) {
        console.log('ensureUserTokens: Tokens already exist for user:', userId);
        return;
      }

      // Only insert if no tokens exist
      const { error } = await supabase
        .from('user_tokens')
        .insert({
          user_id: userId,
          balance: 300,
          total_purchased: 0,
          total_consumed: 0
        });

      if (error) {
        // If it's a duplicate key error, that's fine - tokens already exist
        if (error.code === '23505') {
          console.log('ensureUserTokens: Race condition - tokens already created for user:', userId);
        } else {
          console.error('ensureUserTokens: Error creating tokens:', error);
        }
      } else {
        console.log('ensureUserTokens: Success for user:', userId);
      }
    } catch (error) {
      console.error('ensureUserTokens: Unexpected error:', error);
    }
  };

  const ensureUserProfile = async (user: SupabaseUser) => {
    try {
      console.log('ensureUserProfile: Starting for user:', user.email);
      
      // First check if profile already exists
      const { data: existingProfile, error: checkError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('ensureUserProfile: Error checking existing profile:', checkError);
        return;
      }

      if (existingProfile) {
        console.log('ensureUserProfile: Profile already exists for user:', user.email);
        return;
      }

      // Only insert if no profile exists
      const { error } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
          avatar_url: user.user_metadata?.avatar_url || null,
          has_completed_onboarding: false
        });

      if (error) {
        // If it's a duplicate key error, that's fine - profile already exists
        if (error.code === '23505') {
          console.log('ensureUserProfile: Race condition - profile already created for user:', user.email);
        } else {
          console.error('ensureUserProfile: Error creating profile:', error);
        }
      } else {
        console.log('ensureUserProfile: Success');
      }
    } catch (error) {
      console.error('ensureUserProfile: Unexpected error:', error);
    }
  };

  const ensureDefaultAgentSettings = async (userId: string) => {
    try {
      console.log('ensureDefaultAgentSettings: Starting for user:', userId);
      
      // Check if user already has agent settings
      const { data: existingSettings, error: fetchError } = await supabase
        .from('user_agent_settings')
        .select('*')
        .eq('user_id', userId);

      if (fetchError) {
        console.error('ensureDefaultAgentSettings: Fetch error:', fetchError);
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
        console.log('ensureDefaultAgentSettings: Creating settings:', settingsToInsert);
        const { error: insertError } = await supabase
          .from('user_agent_settings')
          .insert(settingsToInsert);

        if (insertError) {
          console.error('ensureDefaultAgentSettings: Insert error:', insertError);
        } else {
          console.log('ensureDefaultAgentSettings: Settings created successfully');
        }
      } else {
        console.log('ensureDefaultAgentSettings: Settings already configured');
      }
    } catch (error) {
      console.error('ensureDefaultAgentSettings: Unexpected error:', error);
    }
  };

  const handleSignOut = async () => {
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

  useEffect(() => {
    let mounted = true;
    let setupPromises = new Map<string, Promise<void>>(); // Track setup promises per user

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
          
          // Prevent concurrent setup for the same user
          if (!setupPromises.has(session.user.id)) {
            const setupPromise = (async () => {
              try {
                // Sequential setup to avoid race conditions
                await ensureUserProfile(session.user);
                await ensureUserTokens(session.user.id);
                await ensureDefaultAgentSettings(session.user.id);
                
                if (mounted && window.location.pathname === '/auth') {
                  console.log('Redirecting from auth page to main app');
                  window.location.href = '/';
                }
              } catch (error) {
                console.error('Setup error for user:', session.user.id, error);
              } finally {
                setupPromises.delete(session.user.id);
              }
            })();
            
            setupPromises.set(session.user.id, setupPromise);
            
            // Don't await here to avoid blocking the auth state change
            setupPromise.catch(() => {
              // Error already logged above
            });
          }
        }
        
        if (event === 'SIGNED_OUT') {
          console.log('User signed out');
          setupPromises.clear(); // Clear all pending setups
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
          if (session?.user && !setupPromises.has(session.user.id)) {
            const setupPromise = (async () => {
              try {
                await ensureUserProfile(session.user);
                await ensureUserTokens(session.user.id);
                await ensureDefaultAgentSettings(session.user.id);
              } catch (error) {
                console.error('Initial setup error for user:', session.user.id, error);
              } finally {
                setupPromises.delete(session.user.id);
              }
            })();
            
            setupPromises.set(session.user.id, setupPromise);
            
            // Don't await to avoid blocking
            setupPromise.catch(() => {
              // Error already logged above
            });
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
