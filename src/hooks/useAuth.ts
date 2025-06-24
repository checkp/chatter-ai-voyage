
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';

export const useAuth = () => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState(false);
  
  // Use refs to prevent multiple simultaneous setup attempts
  const isSetupInProgress = useRef(false);
  const hasInitialized = useRef(false);

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
    if (isSetupInProgress.current) {
      console.log('Setup already in progress, skipping tokens setup');
      return;
    }

    try {
      console.log('ensureUserTokens: Starting for user:', userId);
      
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
        console.error('ensureUserTokens: Error:', error);
        setConnectionError(true);
        // Don't show toast for connection errors, just log them
        if (!error.message?.includes('Load failed')) {
          toast.error('Failed to initialize user tokens');
        }
      } else {
        console.log('ensureUserTokens: Success for user:', userId);
        setConnectionError(false);
      }
    } catch (error) {
      console.error('ensureUserTokens: Unexpected error:', error);
      setConnectionError(true);
    }
  };

  const ensureUserProfile = async (user: SupabaseUser) => {
    if (isSetupInProgress.current) {
      console.log('Setup already in progress, skipping profile setup');
      return;
    }

    try {
      console.log('ensureUserProfile: Starting for user:', user.email);
      
      // Check if user profile exists
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (fetchError && fetchError.code === 'PGRST116') {
        // No profile found, create one
        console.log('ensureUserProfile: Creating profile for:', user.email);
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
            avatar_url: user.user_metadata?.avatar_url || null,
            has_completed_onboarding: false
          });

        if (insertError) {
          console.error('ensureUserProfile: Insert error:', insertError);
          setConnectionError(true);
          if (!insertError.message?.includes('Load failed')) {
            toast.error('Failed to create user profile');
          }
        } else {
          console.log('ensureUserProfile: Profile created successfully');
          setConnectionError(false);
        }
      } else if (fetchError) {
        console.error('ensureUserProfile: Fetch error:', fetchError);
        setConnectionError(true);
        if (!fetchError.message?.includes('Load failed')) {
          toast.error('Failed to fetch user profile');
        }
      } else {
        console.log('ensureUserProfile: Profile already exists');
        setConnectionError(false);
      }
    } catch (error) {
      console.error('ensureUserProfile: Unexpected error:', error);
      setConnectionError(true);
    }
  };

  const ensureDefaultAgentSettings = async (userId: string) => {
    if (isSetupInProgress.current) {
      console.log('Setup already in progress, skipping agent settings');
      return;
    }

    try {
      console.log('ensureDefaultAgentSettings: Starting for user:', userId);
      
      // Check if user already has agent settings
      const { data: existingSettings, error: fetchError } = await supabase
        .from('user_agent_settings')
        .select('*')
        .eq('user_id', userId);

      if (fetchError) {
        console.error('ensureDefaultAgentSettings: Fetch error:', fetchError);
        setConnectionError(true);
        if (!fetchError.message?.includes('Load failed')) {
          toast.error('Failed to fetch agent settings');
        }
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
          setConnectionError(true);
          if (!insertError.message?.includes('Load failed')) {
            toast.error('Failed to create agent settings');
          }
        } else {
          console.log('ensureDefaultAgentSettings: Settings created successfully');
          setConnectionError(false);
        }
      } else {
        console.log('ensureDefaultAgentSettings: Settings already configured');
        setConnectionError(false);
      }
    } catch (error) {
      console.error('ensureDefaultAgentSettings: Unexpected error:', error);
      setConnectionError(true);
    }
  };

  const setupUserData = async (user: SupabaseUser) => {
    if (isSetupInProgress.current) {
      console.log('User setup already in progress, skipping');
      return;
    }

    isSetupInProgress.current = true;
    console.log('Starting user setup for:', user.email);

    try {
      await Promise.all([
        ensureUserProfile(user),
        ensureUserTokens(user.id),
        ensureDefaultAgentSettings(user.id)
      ]);
      console.log('User setup completed for:', user.email);
    } catch (error) {
      console.error('Error during user setup:', error);
      setConnectionError(true);
    } finally {
      isSetupInProgress.current = false;
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

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        console.log('Auth state change:', event, session?.user?.email);
        
        // Update state synchronously
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        if (event === 'SIGNED_IN' && session?.user && !isSetupInProgress.current) {
          console.log('User signed in successfully:', session.user.email);
          
          // Defer setup to prevent deadlocks and only do it once
          setTimeout(async () => {
            if (mounted && !isSetupInProgress.current) {
              await setupUserData(session.user);
              
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
          isSetupInProgress.current = false;
          setConnectionError(false);
          
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

    // Get initial session only once
    const getInitialSession = async () => {
      if (hasInitialized.current) return;
      hasInitialized.current = true;

      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Error getting initial session:', error);
          // Clean up potentially corrupted auth state
          cleanupAuthState();
          setConnectionError(true);
        }
        
        if (mounted) {
          console.log('Initial session check:', session?.user?.email);
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);

          // Ensure user setup for existing sessions
          if (session?.user && !isSetupInProgress.current) {
            await setupUserData(session.user);
          }
        }
      } catch (error) {
        console.error('Error during initial session check:', error);
        if (mounted) {
          setLoading(false);
          setConnectionError(true);
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

  return { user, session, loading, connectionError, handleSignOut };
};
