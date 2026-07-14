
import { supabase } from '@/integrations/supabase/client';

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
      { platform: 'anthropic', model: 'claude-sonnet-4-20250514', enabled: true },
      { platform: 'deepseek', model: 'deepseek-chat', enabled: true },
      { platform: 'grok', model: 'grok-3', enabled: true },
      { platform: 'mistral', model: 'mistral-large-latest', enabled: true },
      { platform: 'perplexity', model: 'sonar-pro', enabled: true },
      { platform: 'qwen', model: 'qwen-plus', enabled: true },
      { platform: 'nvidia', model: 'nvidia/nemotron-nano-3-30b-a3b', enabled: false }
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
