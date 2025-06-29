
import { supabase } from '@/integrations/supabase/client';
import type { User as SupabaseUser } from '@supabase/supabase-js';

export const ensureUserTokens = async (userId: string) => {
  try {
    console.log('ensureUserTokens: Checking for user:', userId);
    
    // Just check if tokens exist, don't try to create them
    // The database trigger should handle token creation automatically
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
    } else {
      console.log('ensureUserTokens: No tokens found, they should be created by database trigger');
    }
  } catch (error) {
    console.error('ensureUserTokens: Unexpected error:', error);
  }
};

export const ensureUserProfile = async (user: SupabaseUser) => {
  try {
    console.log('ensureUserProfile: Checking for user:', user.email);
    
    // Just check if profile exists, don't try to create it
    // The database trigger should handle profile creation automatically
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
    } else {
      console.log('ensureUserProfile: No profile found, it should be created by database trigger');
    }
  } catch (error) {
    console.error('ensureUserProfile: Unexpected error:', error);
  }
};

export const ensureDefaultAgentSettings = async (userId: string) => {
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
