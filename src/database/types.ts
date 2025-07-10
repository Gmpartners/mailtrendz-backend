export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          name: string
          avatar: string | null
          subscription: 'free' | 'pro' | 'enterprise'
          api_usage_limit: number
          preferences: {
            defaultIndustry: string | null
            defaultTone: string
            emailSignature: string | null
          }
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          name: string
          avatar?: string | null
          subscription?: 'free' | 'pro' | 'enterprise'
          api_usage_limit?: number
          preferences?: {
            defaultIndustry?: string | null
            defaultTone?: string
            emailSignature?: string | null
          }
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          avatar?: string | null
          subscription?: 'free' | 'pro' | 'enterprise'
          api_usage_limit?: number
          preferences?: {
            defaultIndustry?: string | null
            defaultTone?: string
            emailSignature?: string | null
          }
          created_at?: string
          updated_at?: string
        }
      }
      projects: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string
          type: 'campaign' | 'newsletter' | 'transactional' | 'notification' | 'other'
          status: 'draft' | 'active' | 'archived'
          content: {
            html: string
            text: string
            subject: string
            previewText: string
          }
          structure: Json | null
          metadata: {
            industry: string
            targetAudience: string
            tone: string
            originalPrompt: string
            version: number
            aiGenerated?: boolean
            generatedAt?: string
            lastImprovement?: {
              feedback: string
              timestamp: string
              version: number
            }
            lastModified?: string
          }
          tags: string[]
          color: string
          is_public: boolean
          chat_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description: string
          type?: 'campaign' | 'newsletter' | 'transactional' | 'notification' | 'other'
          status?: 'draft' | 'active' | 'archived'
          content: {
            html: string
            text: string
            subject: string
            previewText?: string
          }
          structure?: Json | null
          metadata: {
            industry: string
            targetAudience?: string
            tone?: string
            originalPrompt: string
            version?: number
            aiGenerated?: boolean
            generatedAt?: string
          }
          tags?: string[]
          color?: string
          is_public?: boolean
          chat_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string
          type?: 'campaign' | 'newsletter' | 'transactional' | 'notification' | 'other'
          status?: 'draft' | 'active' | 'archived'
          content?: {
            html?: string
            text?: string
            subject?: string
            previewText?: string
          }
          structure?: Json | null
          metadata?: {
            industry?: string
            targetAudience?: string
            tone?: string
            originalPrompt?: string
            version?: number
            aiGenerated?: boolean
            generatedAt?: string
            lastImprovement?: {
              feedback: string
              timestamp: string
              version: number
            }
            lastModified?: string
          }
          tags?: string[]
          color?: string
          is_public?: boolean
          chat_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      project_stats: {
        Row: {
          id: string
          project_id: string
          opens: number
          clicks: number
          uses: number
          views: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          opens?: number
          clicks?: number
          uses?: number
          views?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          opens?: number
          clicks?: number
          uses?: number
          views?: number
          created_at?: string
          updated_at?: string
        }
      }
      chats: {
        Row: {
          id: string
          user_id: string
          title: string
          context: Json
          project_id: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          context?: Json
          project_id?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          context?: Json
          project_id?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      chat_messages: {
        Row: {
          id: string
          chat_id: string
          role: 'user' | 'assistant' | 'system'
          content: string
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          chat_id: string
          role: 'user' | 'assistant' | 'system'
          content: string
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          chat_id?: string
          role?: 'user' | 'assistant' | 'system'
          content?: string
          metadata?: Json
          created_at?: string
        }
      }
      api_usage_logs: {
        Row: {
          id: string
          user_id: string
          endpoint: string
          tokens_used: number
          cost: number
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          endpoint: string
          tokens_used?: number
          cost?: number
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          endpoint?: string
          tokens_used?: number
          cost?: number
          metadata?: Json
          created_at?: string
        }
      }
      templates: {
        Row: {
          id: string
          name: string
          description: string | null
          industry: string
          type: 'campaign' | 'newsletter' | 'transactional' | 'notification' | 'other'
          structure: Json
          thumbnail: string | null
          is_premium: boolean
          usage_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          industry: string
          type: 'campaign' | 'newsletter' | 'transactional' | 'notification' | 'other'
          structure: Json
          thumbnail?: string | null
          is_premium?: boolean
          usage_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          industry?: string
          type?: 'campaign' | 'newsletter' | 'transactional' | 'notification' | 'other'
          structure?: Json
          thumbnail?: string | null
          is_premium?: boolean
          usage_count?: number
          created_at?: string
          updated_at?: string
        }
      }
      industries: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          templates_count: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          templates_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          templates_count?: number
          created_at?: string
        }
      }
    }
    Views: {
      projects_with_stats: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string
          type: string
          status: string
          content: Json
          structure: Json | null
          metadata: Json
          tags: string[]
          color: string
          is_public: boolean
          chat_id: string | null
          created_at: string
          updated_at: string
          opens: number
          clicks: number
          uses: number
          views: number
          conversion_rate: number
        }
      }
      user_api_usage_summary: {
        Row: {
          user_id: string
          month: string
          request_count: number
          total_tokens: number
          total_cost: number
        }
      }
    }
    Functions: {
      check_api_limit: {
        Args: {
          p_user_id: string
        }
        Returns: boolean
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
    }
    Enums: {
      subscription_type: 'free' | 'pro' | 'enterprise'
      project_type: 'campaign' | 'newsletter' | 'transactional' | 'notification' | 'other'
      project_status: 'draft' | 'active' | 'archived'
    }
  }
}