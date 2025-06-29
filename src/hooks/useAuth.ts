
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { cleanupAuthState } from './auth/authStateCleanup';
import { ensureUserProfile, ensureUserTokens, ensureDefaultAgentSettings } from './auth/userSetupOperations';
import { handleSignOut } from './auth/signOutHandler';

export const useAuth = () => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

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
