export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      api_usage_logs: {
        Row: {
          cost: number | null
          created_at: string | null
          endpoint: string
          id: string
          metadata: Json | null
          tokens_used: number | null
          user_id: string
        }
        Insert: {
          cost?: number | null
          created_at?: string | null
          endpoint: string
          id?: string
          metadata?: Json | null
          tokens_used?: number | null
          user_id: string
        }
        Update: {
          cost?: number | null
          created_at?: string | null
          endpoint?: string
          id?: string
          metadata?: Json | null
          tokens_used?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_usage_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_usage_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "subscription_state"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "api_usage_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_current_usage"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "api_usage_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_usage_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      backup_chat_messages_20250717: {
        Row: {
          chat_id: string | null
          content: string | null
          created_at: string | null
          id: string | null
          metadata: Json | null
          role: string | null
        }
        Insert: {
          chat_id?: string | null
          content?: string | null
          created_at?: string | null
          id?: string | null
          metadata?: Json | null
          role?: string | null
        }
        Update: {
          chat_id?: string | null
          content?: string | null
          created_at?: string | null
          id?: string | null
          metadata?: Json | null
          role?: string | null
        }
        Relationships: []
      }
      backup_chats_20250717: {
        Row: {
          context: Json | null
          created_at: string | null
          id: string | null
          is_active: boolean | null
          project_id: string | null
          title: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          context?: Json | null
          created_at?: string | null
          id?: string | null
          is_active?: boolean | null
          project_id?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          context?: Json | null
          created_at?: string | null
          id?: string | null
          is_active?: boolean | null
          project_id?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      backup_projects_20250724: {
        Row: {
          chat_id: string | null
          color: string | null
          content: Json | null
          created_at: string | null
          description: string | null
          folder_id: string | null
          id: string | null
          is_public: boolean | null
          metadata: Json | null
          name: string | null
          status: Database["public"]["Enums"]["project_status"] | null
          structure: Json | null
          tags: string[] | null
          type: Database["public"]["Enums"]["project_type"] | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          chat_id?: string | null
          color?: string | null
          content?: Json | null
          created_at?: string | null
          description?: string | null
          folder_id?: string | null
          id?: string | null
          is_public?: boolean | null
          metadata?: Json | null
          name?: string | null
          status?: Database["public"]["Enums"]["project_status"] | null
          structure?: Json | null
          tags?: string[] | null
          type?: Database["public"]["Enums"]["project_type"] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          chat_id?: string | null
          color?: string | null
          content?: Json | null
          created_at?: string | null
          description?: string | null
          folder_id?: string | null
          id?: string | null
          is_public?: boolean | null
          metadata?: Json | null
          name?: string | null
          status?: Database["public"]["Enums"]["project_status"] | null
          structure?: Json | null
          tags?: string[] | null
          type?: Database["public"]["Enums"]["project_type"] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          chat_id: string
          content: string
          created_at: string | null
          id: string
          metadata: Json | null
          role: string
        }
        Insert: {
          chat_id: string
          content: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role: string
        }
        Update: {
          chat_id?: string
          content?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "v_empty_chats"
            referencedColumns: ["id"]
          },
        ]
      }
      chats: {
        Row: {
          context: Json | null
          created_at: string | null
          id: string
          is_active: boolean | null
          organization_id: string | null
          project_id: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          context?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          organization_id?: string | null
          project_id?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          context?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          organization_id?: string | null
          project_id?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chats_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chats_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chats_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "subscription_state"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "chats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_current_usage"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "chats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_usage_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      folders: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          name: string
          organization_id: string | null
          parent_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          name: string
          organization_id?: string | null
          parent_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          name?: string
          organization_id?: string | null
          parent_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "folders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "folders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "folders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "subscription_state"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "folders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_current_usage"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "folders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_usage_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      industries: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          slug: string
          templates_count: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          slug: string
          templates_count?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          slug?: string
          templates_count?: number | null
        }
        Relationships: []
      }
      migration_backup_profiles_20250721: {
        Row: {
          api_usage_limit: number | null
          avatar: string | null
          billing_cycle_day: number | null
          created_at: string | null
          email: string | null
          id: string | null
          name: string | null
          preferences: Json | null
          subscription: Database["public"]["Enums"]["subscription_type"] | null
          subscription_started_at: string | null
          updated_at: string | null
        }
        Insert: {
          api_usage_limit?: number | null
          avatar?: string | null
          billing_cycle_day?: number | null
          created_at?: string | null
          email?: string | null
          id?: string | null
          name?: string | null
          preferences?: Json | null
          subscription?: Database["public"]["Enums"]["subscription_type"] | null
          subscription_started_at?: string | null
          updated_at?: string | null
        }
        Update: {
          api_usage_limit?: number | null
          avatar?: string | null
          billing_cycle_day?: number | null
          created_at?: string | null
          email?: string | null
          id?: string | null
          name?: string | null
          preferences?: Json | null
          subscription?: Database["public"]["Enums"]["subscription_type"] | null
          subscription_started_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      migration_backup_usage_20250721: {
        Row: {
          created_at: string | null
          id: string | null
          period_end: string | null
          period_month: string | null
          period_start: string | null
          requests_used: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          period_end?: string | null
          period_month?: string | null
          period_start?: string | null
          requests_used?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          period_end?: string | null
          period_month?: string | null
          period_start?: string | null
          requests_used?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      organization_activity_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          ip_address: unknown | null
          metadata: Json | null
          organization_id: string | null
          resource_id: string | null
          resource_type: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          organization_id?: string | null
          resource_id?: string | null
          resource_type?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          organization_id?: string | null
          resource_id?: string | null
          resource_type?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_activity_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_activity_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_activity_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "subscription_state"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "organization_activity_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_current_usage"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "organization_activity_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_usage_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      organization_api_usage_logs: {
        Row: {
          cost: number | null
          created_at: string | null
          endpoint: string
          id: string
          metadata: Json | null
          organization_id: string | null
          tokens_used: number | null
          user_id: string | null
        }
        Insert: {
          cost?: number | null
          created_at?: string | null
          endpoint: string
          id?: string
          metadata?: Json | null
          organization_id?: string | null
          tokens_used?: number | null
          user_id?: string | null
        }
        Update: {
          cost?: number | null
          created_at?: string | null
          endpoint?: string
          id?: string
          metadata?: Json | null
          organization_id?: string | null
          tokens_used?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_api_usage_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_api_usage_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_api_usage_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "subscription_state"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "organization_api_usage_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_current_usage"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "organization_api_usage_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_usage_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      organization_invites: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          declined_at: string | null
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          organization_id: string | null
          role: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          declined_at?: string | null
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          organization_id?: string | null
          role: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          declined_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          organization_id?: string | null
          role?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "subscription_state"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "organization_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "user_current_usage"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "organization_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "user_usage_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "organization_invites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          accepted_at: string | null
          id: string
          invited_at: string | null
          invited_by: string | null
          last_active_at: string | null
          organization_id: string | null
          permissions: Json | null
          role: string
          user_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          last_active_at?: string | null
          organization_id?: string | null
          permissions?: Json | null
          role: string
          user_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          last_active_at?: string | null
          organization_id?: string | null
          permissions?: Json | null
          role?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "subscription_state"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "organization_members_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "user_current_usage"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "organization_members_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "user_usage_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "subscription_state"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "organization_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_current_usage"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "organization_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_usage_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      organization_monthly_usage: {
        Row: {
          created_at: string | null
          id: string
          organization_id: string | null
          period_end: string
          period_month: string | null
          period_start: string
          requests_used: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          organization_id?: string | null
          period_end: string
          period_month?: string | null
          period_start: string
          requests_used?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          organization_id?: string | null
          period_end?: string
          period_month?: string | null
          period_start?: string
          requests_used?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_monthly_usage_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          billing_cycle_end: string | null
          billing_cycle_start: string | null
          created_at: string | null
          credits_limit: number | null
          credits_used: number | null
          id: string
          logo_url: string | null
          max_members: number | null
          name: string
          owner_id: string | null
          settings: Json | null
          slug: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_type:
            | Database["public"]["Enums"]["subscription_type"]
            | null
          updated_at: string | null
        }
        Insert: {
          billing_cycle_end?: string | null
          billing_cycle_start?: string | null
          created_at?: string | null
          credits_limit?: number | null
          credits_used?: number | null
          id?: string
          logo_url?: string | null
          max_members?: number | null
          name: string
          owner_id?: string | null
          settings?: Json | null
          slug: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_type?:
            | Database["public"]["Enums"]["subscription_type"]
            | null
          updated_at?: string | null
        }
        Update: {
          billing_cycle_end?: string | null
          billing_cycle_start?: string | null
          created_at?: string | null
          credits_limit?: number | null
          credits_used?: number | null
          id?: string
          logo_url?: string | null
          max_members?: number | null
          name?: string
          owner_id?: string | null
          settings?: Json | null
          slug?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_type?:
            | Database["public"]["Enums"]["subscription_type"]
            | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organizations_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organizations_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "subscription_state"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "organizations_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "user_current_usage"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "organizations_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "user_usage_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      plan_features: {
        Row: {
          ai_credits: number | null
          created_at: string | null
          has_email_preview: boolean | null
          has_folders: boolean | null
          has_html_export: boolean | null
          has_multi_user: boolean | null
          id: string
          max_projects: number | null
          plan_type: Database["public"]["Enums"]["subscription_type"]
        }
        Insert: {
          ai_credits?: number | null
          created_at?: string | null
          has_email_preview?: boolean | null
          has_folders?: boolean | null
          has_html_export?: boolean | null
          has_multi_user?: boolean | null
          id?: string
          max_projects?: number | null
          plan_type: Database["public"]["Enums"]["subscription_type"]
        }
        Update: {
          ai_credits?: number | null
          created_at?: string | null
          has_email_preview?: boolean | null
          has_folders?: boolean | null
          has_html_export?: boolean | null
          has_multi_user?: boolean | null
          id?: string
          max_projects?: number | null
          plan_type?: Database["public"]["Enums"]["subscription_type"]
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active_organization_id: string | null
          api_usage_limit: number | null
          avatar: string | null
          billing_cycle_day: number | null
          created_at: string | null
          email: string | null
          free_requests_limit: number | null
          free_requests_used: number | null
          id: string
          is_lifetime_free: boolean | null
          name: string
          preferences: Json | null
          subscription: Database["public"]["Enums"]["subscription_type"] | null
          subscription_started_at: string | null
          updated_at: string | null
        }
        Insert: {
          active_organization_id?: string | null
          api_usage_limit?: number | null
          avatar?: string | null
          billing_cycle_day?: number | null
          created_at?: string | null
          email?: string | null
          free_requests_limit?: number | null
          free_requests_used?: number | null
          id: string
          is_lifetime_free?: boolean | null
          name: string
          preferences?: Json | null
          subscription?: Database["public"]["Enums"]["subscription_type"] | null
          subscription_started_at?: string | null
          updated_at?: string | null
        }
        Update: {
          active_organization_id?: string | null
          api_usage_limit?: number | null
          avatar?: string | null
          billing_cycle_day?: number | null
          created_at?: string | null
          email?: string | null
          free_requests_limit?: number | null
          free_requests_used?: number | null
          id?: string
          is_lifetime_free?: boolean | null
          name?: string
          preferences?: Json | null
          subscription?: Database["public"]["Enums"]["subscription_type"] | null
          subscription_started_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_active_organization_id_fkey"
            columns: ["active_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      project_stats: {
        Row: {
          clicks: number | null
          created_at: string | null
          id: string
          opens: number | null
          project_id: string
          updated_at: string | null
          uses: number | null
          views: number | null
        }
        Insert: {
          clicks?: number | null
          created_at?: string | null
          id?: string
          opens?: number | null
          project_id: string
          updated_at?: string | null
          uses?: number | null
          views?: number | null
        }
        Update: {
          clicks?: number | null
          created_at?: string | null
          id?: string
          opens?: number | null
          project_id?: string
          updated_at?: string | null
          uses?: number | null
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "project_stats_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_stats_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects_with_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          chat_id: string | null
          color: string | null
          content: Json
          created_at: string | null
          created_by: string | null
          description: string
          folder_id: string | null
          id: string
          is_favorite: boolean | null
          is_public: boolean | null
          last_edited_at: string | null
          last_edited_by: string | null
          metadata: Json
          name: string
          organization_id: string | null
          status: Database["public"]["Enums"]["project_status"] | null
          structure: Json | null
          tags: string[] | null
          type: Database["public"]["Enums"]["project_type"] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          chat_id?: string | null
          color?: string | null
          content?: Json
          created_at?: string | null
          created_by?: string | null
          description: string
          folder_id?: string | null
          id?: string
          is_favorite?: boolean | null
          is_public?: boolean | null
          last_edited_at?: string | null
          last_edited_by?: string | null
          metadata?: Json
          name: string
          organization_id?: string | null
          status?: Database["public"]["Enums"]["project_status"] | null
          structure?: Json | null
          tags?: string[] | null
          type?: Database["public"]["Enums"]["project_type"] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          chat_id?: string | null
          color?: string | null
          content?: Json
          created_at?: string | null
          created_by?: string | null
          description?: string
          folder_id?: string | null
          id?: string
          is_favorite?: boolean | null
          is_public?: boolean | null
          last_edited_at?: string | null
          last_edited_by?: string | null
          metadata?: Json
          name?: string
          organization_id?: string | null
          status?: Database["public"]["Enums"]["project_status"] | null
          structure?: Json | null
          tags?: string[] | null
          type?: Database["public"]["Enums"]["project_type"] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "subscription_state"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_current_usage"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_usage_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "projects_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_last_edited_by_fkey"
            columns: ["last_edited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_last_edited_by_fkey"
            columns: ["last_edited_by"]
            isOneToOne: false
            referencedRelation: "subscription_state"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "projects_last_edited_by_fkey"
            columns: ["last_edited_by"]
            isOneToOne: false
            referencedRelation: "user_current_usage"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "projects_last_edited_by_fkey"
            columns: ["last_edited_by"]
            isOneToOne: false
            referencedRelation: "user_usage_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "subscription_state"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "projects_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_current_usage"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "projects_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_usage_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          billing_interval: string | null
          cancel_at_period_end: boolean | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan_type: Database["public"]["Enums"]["subscription_type"] | null
          status: string | null
          stripe_customer_id: string | null
          stripe_price_id: string | null
          stripe_subscription_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          billing_interval?: string | null
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_type?: Database["public"]["Enums"]["subscription_type"] | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          billing_interval?: string | null
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_type?: Database["public"]["Enums"]["subscription_type"] | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "subscription_state"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_current_usage"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_usage_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      templates: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          industry: string
          is_premium: boolean | null
          name: string
          organization_id: string | null
          structure: Json
          thumbnail: string | null
          type: Database["public"]["Enums"]["project_type"]
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          industry: string
          is_premium?: boolean | null
          name: string
          organization_id?: string | null
          structure: Json
          thumbnail?: string | null
          type: Database["public"]["Enums"]["project_type"]
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          industry?: string
          is_premium?: boolean | null
          name?: string
          organization_id?: string | null
          structure?: Json
          thumbnail?: string | null
          type?: Database["public"]["Enums"]["project_type"]
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_monthly_usage: {
        Row: {
          created_at: string | null
          id: string
          period_end: string
          period_month: string | null
          period_start: string
          requests_used: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          period_end: string
          period_month?: string | null
          period_start: string
          requests_used?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          period_end?: string
          period_month?: string | null
          period_start?: string
          requests_used?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_monthly_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_monthly_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "subscription_state"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_monthly_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_current_usage"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_monthly_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_usage_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_ip_tracking: {
        Row: {
          id: string
          user_id: string
          ip_address: string
          user_agent: string | null
          created_at: string | null
          last_seen: string | null
          signup_ip: boolean | null
          login_count: number | null
          provider: string | null
        }
        Insert: {
          id?: string
          user_id: string
          ip_address: string
          user_agent?: string | null
          created_at?: string | null
          last_seen?: string | null
          signup_ip?: boolean | null
          login_count?: number | null
          provider?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          ip_address?: string
          user_agent?: string | null
          created_at?: string | null
          last_seen?: string | null
          signup_ip?: boolean | null
          login_count?: number | null
          provider?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_ip_tracking_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      ip_blacklist: {
        Row: {
          id: string
          ip_address: string
          reason: string
          blocked_by: string | null
          blocked_at: string | null
          expires_at: string | null
          is_permanent: boolean | null
          auto_blocked: boolean | null
          violation_count: number | null
        }
        Insert: {
          id?: string
          ip_address: string
          reason: string
          blocked_by?: string | null
          blocked_at?: string | null
          expires_at?: string | null
          is_permanent?: boolean | null
          auto_blocked?: boolean | null
          violation_count?: number | null
        }
        Update: {
          id?: string
          ip_address?: string
          reason?: string
          blocked_by?: string | null
          blocked_at?: string | null
          expires_at?: string | null
          is_permanent?: boolean | null
          auto_blocked?: boolean | null
          violation_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ip_blacklist_blocked_by_fkey"
            columns: ["blocked_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      admin_logs: {
        Row: {
          id: string
          action: string
          ip_address: string | null
          details: Json | null
          created_at: string | null
        }
        Insert: {
          id?: string
          action: string
          ip_address?: string | null
          details?: Json | null
          created_at?: string | null
        }
        Update: {
          id?: string
          action?: string
          ip_address?: string | null
          details?: Json | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_logs_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      chat_errors_monitor: {
        Row: {
          ai_messages: number | null
          assistant_messages: number | null
          hour: string | null
          system_messages: number | null
          total_messages: number | null
          user_messages: number | null
        }
        Relationships: []
      }
      conversion_potential: {
        Row: {
          porcentagem: number | null
          potencial_conversao: string | null
          usuarios: number | null
        }
        Relationships: []
      }
      free_plan_monitoring: {
        Row: {
          activation_percentage: number | null
          exhausted_percentage: number | null
          metric: string | null
          total_free_users: number | null
          users_exhausted: number | null
          users_tried_once: number | null
          users_tried_twice: number | null
          users_unused: number | null
        }
        Relationships: []
      }
      monthly_usage_limits: {
        Row: {
          plan_type: string | null
          requests_limit: number | null
        }
        Relationships: []
      }
      projects_with_stats: {
        Row: {
          chat_id: string | null
          clicks: number | null
          color: string | null
          content: Json | null
          conversion_rate: number | null
          created_at: string | null
          description: string | null
          folder_id: string | null
          id: string | null
          is_favorite: boolean | null
          is_public: boolean | null
          metadata: Json | null
          name: string | null
          opens: number | null
          status: Database["public"]["Enums"]["project_status"] | null
          structure: Json | null
          tags: string[] | null
          type: Database["public"]["Enums"]["project_type"] | null
          updated_at: string | null
          user_id: string | null
          uses: number | null
          views: number | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "subscription_state"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "projects_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_current_usage"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "projects_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_usage_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      subscription_health: {
        Row: {
          active_subscriptions: number | null
          desynced_users: number | null
          stripe_subscriptions: number | null
          synced_users: number | null
          total_users: number | null
          users_by_plan: Json | null
        }
        Relationships: []
      }
      subscription_state: {
        Row: {
          cancel_at_period_end: boolean | null
          credits_available: number | null
          credits_used: number | null
          current_period_end: string | null
          current_period_start: string | null
          email: string | null
          free_requests_limit: number | null
          free_requests_used: number | null
          has_email_preview: boolean | null
          has_folders: boolean | null
          has_html_export: boolean | null
          has_multi_user: boolean | null
          is_free_plan: boolean | null
          is_lifetime_free: boolean | null
          is_unlimited: boolean | null
          max_projects: number | null
          monthly_credits: number | null
          name: string | null
          plan_type: Database["public"]["Enums"]["subscription_type"] | null
          status: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          usage_period_end: string | null
          usage_period_start: string | null
          user_id: string | null
        }
        Relationships: []
      }
      system_health: {
        Row: {
          checked_at: string | null
          enterprise_users: number | null
          migrated_to_lifetime: number | null
          paid_users: number | null
          status: string | null
          total_free: number | null
          unlimited_users: number | null
        }
        Relationships: []
      }
      user_api_usage_summary: {
        Row: {
          month: string | null
          request_count: number | null
          total_cost: number | null
          total_tokens: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_usage_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_usage_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "subscription_state"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "api_usage_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_current_usage"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "api_usage_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_usage_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_current_usage: {
        Row: {
          days_until_reset: number | null
          email: string | null
          period_end: string | null
          period_start: string | null
          plan_type: Database["public"]["Enums"]["subscription_type"] | null
          requests_available: number | null
          requests_limit: number | null
          requests_used: number | null
          user_id: string | null
        }
        Relationships: []
      }
      user_usage_summary: {
        Row: {
          credit_status: string | null
          credits_available: number | null
          credits_used: number | null
          email: string | null
          features: Json | null
          monthly_credits: number | null
          plan_type: Database["public"]["Enums"]["subscription_type"] | null
          status: string | null
          usage_period_end: string | null
          usage_period_start: string | null
          user_id: string | null
        }
        Relationships: []
      }
      v_chat_creation_activity: {
        Row: {
          chats_created: number | null
          date: string | null
          projects_involved: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "subscription_state"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "chats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_current_usage"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "chats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_usage_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      v_chat_health_dashboard: {
        Row: {
          chats_today: number | null
          chats_week: number | null
          empty_chats: number | null
          health_score: number | null
          projects_with_duplicates: number | null
          total_chats: number | null
          unique_projects: number | null
          unique_users: number | null
        }
        Relationships: []
      }
      v_empty_chats: {
        Row: {
          age_hours: number | null
          created_at: string | null
          id: string | null
          project_id: string | null
          title: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chats_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chats_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "subscription_state"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "chats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_current_usage"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "chats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_usage_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      v_multiple_chats: {
        Row: {
          chat_count: number | null
          chat_ids: string[] | null
          chat_titles: string[] | null
          project_id: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chats_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chats_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "subscription_state"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "chats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_current_usage"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "chats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_usage_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Functions: {
      check_and_create_new_periods: {
        Args: Record<PropertyKey, never>
        Returns: {
          user_id: string
          new_period_created: boolean
        }[]
      }
      check_api_limit: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      check_chat_explosion: {
        Args: Record<PropertyKey, never>
        Returns: {
          user_id: string
          project_id: string
          chat_count: number
          severity: string
        }[]
      }
      check_feature_access: {
        Args: { p_user_id: string; p_feature: string }
        Returns: boolean
      }
      check_monthly_request_limit: {
        Args: { p_user_id: string }
        Returns: {
          can_make_request: boolean
          requests_used: number
          requests_limit: number
          requests_available: number
          message: string
        }[]
      }
      check_project_limit: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      check_rollout_health: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      check_user_credits: {
        Args: { p_user_id: string; p_credits: number }
        Returns: boolean
      }
      cleanup_empty_chats: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      consolidate_duplicate_chats: {
        Args: { p_user_id: string; p_project_id: string }
        Returns: boolean
      }
      consume_ai_credit: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      consume_credit: {
        Args: { p_user_id: string; p_amount?: number }
        Returns: Json
      }
      consume_monthly_request: {
        Args: { p_user_id: string }
        Returns: {
          success: boolean
          requests_used: number
          requests_limit: number
          requests_available: number
          message: string
        }[]
      }
      consume_user_credits: {
        Args: { p_user_id: string; p_credits: number }
        Returns: boolean
      }
      ensure_current_period: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      execute_safe_query: {
        Args: { sql_query: string; query_params?: Json }
        Returns: Json
      }
      find_upgrade_candidates: {
        Args: { p_plan_type?: string; p_threshold?: number }
        Returns: Json
      }
      generate_analytics_report: {
        Args: { p_timeframe?: string; p_user_id?: string }
        Returns: Json
      }
      generate_unique_slug: {
        Args: { base_text: string; table_name: string }
        Returns: string
      }
      get_conversion_alerts: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_current_billing_period: {
        Args: { p_user_id: string }
        Returns: {
          period_start: string
          period_end: string
        }[]
      }
      get_or_create_organization_monthly_usage: {
        Args: { p_organization_id: string; p_date?: string }
        Returns: {
          created_at: string | null
          id: string
          organization_id: string | null
          period_end: string
          period_month: string | null
          period_start: string
          requests_used: number | null
          updated_at: string | null
        }
      }
      get_platform_stats: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_schema_info: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_user_analysis: {
        Args: { p_user_id: string }
        Returns: Json
      }
      get_user_monthly_usage: {
        Args: { p_user_id: string }
        Returns: {
          period_start: string
          period_end: string
          requests_used: number
          requests_limit: number
          requests_available: number
          plan_type: string
          days_until_reset: number
          is_current_period: boolean
        }[]
      }
      increment_api_usage: {
        Args: {
          p_user_id: string
          p_endpoint: string
          p_tokens?: number
          p_cost?: number
        }
        Returns: undefined
      }
      increment_monthly_usage: {
        Args: {
          p_user_id: string
          p_amount: number
          p_period_start: string
          p_period_end: string
        }
        Returns: undefined
      }
      increment_organization_usage: {
        Args: {
          p_organization_id: string
          p_user_id: string
          p_endpoint: string
          p_tokens?: number
          p_cost?: number
        }
        Returns: Json
      }
      initialize_monthly_usage_for_all_users: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      initialize_user_credits: {
        Args: {
          p_user_id: string
          p_plan_type: Database["public"]["Enums"]["subscription_type"]
        }
        Returns: undefined
      }
      log_api_usage: {
        Args: {
          p_user_id: string
          p_endpoint: string
          p_tokens_used?: number
          p_cost?: number
        }
        Returns: undefined
      }
      run_chat_maintenance: {
        Args: Record<PropertyKey, never>
        Returns: {
          empty_chats_deleted: number
          users_consolidated: number
          total_chats_removed: number
        }[]
      }
      sync_all_subscriptions: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      use_ai_credits: {
        Args: { p_user_id: string; p_amount?: number }
        Returns: boolean
      }
      user_has_feature: {
        Args: { p_user_id: string; p_feature: string }
        Returns: boolean
      }
    }
    Enums: {
      project_status: "draft" | "active" | "archived"
      project_type:
        | "campaign"
        | "newsletter"
        | "transactional"
        | "notification"
        | "other"
      subscription_type: "free" | "starter" | "enterprise" | "unlimited"
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
    Enums: {
      project_status: ["draft", "active", "archived"],
      project_type: [
        "campaign",
        "newsletter",
        "transactional",
        "notification",
        "other",
      ],
      subscription_type: ["free", "starter", "enterprise", "unlimited"],
    },
  },
} as const
