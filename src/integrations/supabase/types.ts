export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      conversations: {
        Row: {
          chat_mode: string
          conductor_platform: string | null
          created_at: string
          id: string
          isolated_mode: boolean | null
          shared_context_enabled: boolean
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          chat_mode?: string
          conductor_platform?: string | null
          created_at?: string
          id?: string
          isolated_mode?: boolean | null
          shared_context_enabled?: boolean
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          chat_mode?: string
          conductor_platform?: string | null
          created_at?: string
          id?: string
          isolated_mode?: boolean | null
          shared_context_enabled?: boolean
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      demo_daily_usage: {
        Row: {
          day: string
          total_calls: number
          updated_at: string
        }
        Insert: {
          day: string
          total_calls?: number
          updated_at?: string
        }
        Update: {
          day?: string
          total_calls?: number
          updated_at?: string
        }
        Relationships: []
      }
      demo_rate_limits: {
        Row: {
          day_count: number
          day_window_start: string
          hour_count: number
          hour_window_start: string
          updated_at: string
          user_id: string
        }
        Insert: {
          day_count?: number
          day_window_start?: string
          hour_count?: number
          hour_window_start?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          day_count?: number
          day_window_start?: string
          hour_count?: number
          hour_window_start?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      generated_images: {
        Row: {
          created_at: string
          file_name: string
          id: string
          image_url: string
          model_used: string | null
          prompt: string
          size: string | null
          tokens_used: number
          user_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          id?: string
          image_url: string
          model_used?: string | null
          prompt: string
          size?: string | null
          tokens_used?: number
          user_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          id?: string
          image_url?: string
          model_used?: string | null
          prompt?: string
          size?: string | null
          tokens_used?: number
          user_id?: string
        }
        Relationships: []
      }
      image_model_pricing: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          model_id: string
          notes: string | null
          platform: string
          size: string
          updated_at: string
          usd_per_image: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          model_id: string
          notes?: string | null
          platform: string
          size?: string
          updated_at?: string
          usd_per_image?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          model_id?: string
          notes?: string | null
          platform?: string
          size?: string
          updated_at?: string
          usd_per_image?: number
        }
        Relationships: []
      }
      message_embeddings: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          embedding: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          embedding: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          embedding?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          attachments: Json
          content: string
          conversation_id: string
          created_at: string
          id: string
          platform: string | null
          sender: string
        }
        Insert: {
          attachments?: Json
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          platform?: string | null
          sender: string
        }
        Update: {
          attachments?: Json
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          platform?: string | null
          sender?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      model_pricing: {
        Row: {
          api_cost_per_1k_tokens: number | null
          cost_tier: string
          created_at: string | null
          id: string
          model_id: string
          platform: string
          tokens_per_message: number
          updated_at: string | null
        }
        Insert: {
          api_cost_per_1k_tokens?: number | null
          cost_tier: string
          created_at?: string | null
          id?: string
          model_id: string
          platform: string
          tokens_per_message: number
          updated_at?: string | null
        }
        Update: {
          api_cost_per_1k_tokens?: number | null
          cost_tier?: string
          created_at?: string | null
          id?: string
          model_id?: string
          platform?: string
          tokens_per_message?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          custom_conductor_prompt: string | null
          custom_system_prompt: string | null
          email: string | null
          full_name: string | null
          has_completed_onboarding: boolean | null
          has_seen_conductor_onboarding: boolean | null
          id: string
          is_admin: boolean | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          custom_conductor_prompt?: string | null
          custom_system_prompt?: string | null
          email?: string | null
          full_name?: string | null
          has_completed_onboarding?: boolean | null
          has_seen_conductor_onboarding?: boolean | null
          id: string
          is_admin?: boolean | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          custom_conductor_prompt?: string | null
          custom_system_prompt?: string | null
          email?: string | null
          full_name?: string | null
          has_completed_onboarding?: boolean | null
          has_seen_conductor_onboarding?: boolean | null
          id?: string
          is_admin?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      remarkable_connections: {
        Row: {
          connected_at: string
          device_id: string
          device_token: string
          last_sync_at: string | null
          updated_at: string
          user_id: string
          user_token: string | null
          user_token_expires_at: string | null
        }
        Insert: {
          connected_at?: string
          device_id: string
          device_token: string
          last_sync_at?: string | null
          updated_at?: string
          user_id: string
          user_token?: string | null
          user_token_expires_at?: string | null
        }
        Update: {
          connected_at?: string
          device_id?: string
          device_token?: string
          last_sync_at?: string | null
          updated_at?: string
          user_id?: string
          user_token?: string | null
          user_token_expires_at?: string | null
        }
        Relationships: []
      }
      remarkable_notes: {
        Row: {
          created_at: string
          doc_id: string
          doc_type: string
          extract_model: string | null
          extracted_at: string | null
          extracted_text: string | null
          id: string
          modified_at: string | null
          name: string
          parent_id: string | null
          path: string | null
          pdf_path: string | null
          pdf_size: number | null
          synced_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          doc_id: string
          doc_type?: string
          extract_model?: string | null
          extracted_at?: string | null
          extracted_text?: string | null
          id?: string
          modified_at?: string | null
          name?: string
          parent_id?: string | null
          path?: string | null
          pdf_path?: string | null
          pdf_size?: number | null
          synced_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          doc_id?: string
          doc_type?: string
          extract_model?: string | null
          extracted_at?: string | null
          extracted_text?: string | null
          id?: string
          modified_at?: string | null
          name?: string
          parent_id?: string | null
          path?: string | null
          pdf_path?: string | null
          pdf_size?: number | null
          synced_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      roboheard_api_keys: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          revoked_at: string | null
          scope: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          revoked_at?: string | null
          scope?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          revoked_at?: string | null
          scope?: string
          user_id?: string
        }
        Relationships: []
      }
      token_packages: {
        Row: {
          bonus_percentage: number | null
          created_at: string | null
          id: string
          is_active: boolean | null
          lemonsqueezy_variant_id: string | null
          name: string
          price_cents: number
          sort_order: number | null
          tokens: number
        }
        Insert: {
          bonus_percentage?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          lemonsqueezy_variant_id?: string | null
          name: string
          price_cents: number
          sort_order?: number | null
          tokens: number
        }
        Update: {
          bonus_percentage?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          lemonsqueezy_variant_id?: string | null
          name?: string
          price_cents?: number
          sort_order?: number | null
          tokens?: number
        }
        Relationships: []
      }
      token_transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string | null
          description: string | null
          id: string
          metadata: Json | null
          transaction_type: string
          user_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          transaction_type: string
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          transaction_type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_agent_settings: {
        Row: {
          created_at: string
          custom_instructions: string | null
          display_order: number | null
          enabled: boolean
          id: string
          model: string | null
          platform: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          custom_instructions?: string | null
          display_order?: number | null
          enabled?: boolean
          id?: string
          model?: string | null
          platform: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          custom_instructions?: string | null
          display_order?: number | null
          enabled?: boolean
          id?: string
          model?: string | null
          platform?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_api_keys: {
        Row: {
          created_at: string
          encrypted_key: string
          id: string
          platform: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          encrypted_key: string
          id?: string
          platform: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          encrypted_key?: string
          id?: string
          platform?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_capability_defaults: {
        Row: {
          code_exec: boolean
          created_at: string
          deep_research: boolean
          id: string
          platform: string
          search: boolean
          think: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          code_exec?: boolean
          created_at?: string
          deep_research?: boolean
          id?: string
          platform: string
          search?: boolean
          think?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          code_exec?: boolean
          created_at?: string
          deep_research?: boolean
          id?: string
          platform?: string
          search?: boolean
          think?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_mcp_settings: {
        Row: {
          created_at: string
          default_conductor_platform: string
          default_web_search_model: string
          enabled_platforms: Json
          enabled_tools: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          default_conductor_platform?: string
          default_web_search_model?: string
          enabled_platforms?: Json
          enabled_tools?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          default_conductor_platform?: string
          default_web_search_model?: string
          enabled_platforms?: Json
          enabled_tools?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_memory: {
        Row: {
          content: string
          created_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_tokens: {
        Row: {
          balance: number
          created_at: string | null
          id: string
          total_consumed: number | null
          total_purchased: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string | null
          id?: string
          total_consumed?: number | null
          total_purchased?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string | null
          id?: string
          total_consumed?: number | null
          total_purchased?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_daily_tokens: { Args: never; Returns: undefined }
      deduct_user_tokens: {
        Args: { p_tokens: number; p_user_id: string }
        Returns: {
          new_balance: number
          new_total_consumed: number
        }[]
      }
      is_current_user_admin: { Args: never; Returns: boolean }
      match_user_context: {
        Args: {
          p_exclude_conversation?: string
          p_match_count?: number
          p_query_embedding: string
          p_user_id: string
        }
        Returns: {
          content: string
          conversation_id: string
          created_at: string
          message_id: string
          similarity: number
        }[]
      }
      set_user_admin: {
        Args: { make_admin: boolean; target_user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
