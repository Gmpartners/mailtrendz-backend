import { Database } from '../database/types'

// ✅ USAR TIPO DO SUPABASE
type SubscriptionType = Database['public']['Enums']['subscription_type']

// Types para o sistema de assinaturas
export interface SubscriptionState {
  userId: string
  email: string
  name: string
  planType: SubscriptionType
  status: string
  monthlyCredits: number
  creditsAvailable: number
  creditsUsed: number
  features: {
    maxProjects: number
    hasMultiUser: boolean
    hasHtmlExport: boolean
    hasEmailPreview: boolean
    hasAiImageAnalysis: boolean  // ✅ NOVA FEATURE
  }
  isUnlimited: boolean
  stripeCustomerId?: string
  stripeSubscriptionId?: string
  currentPeriodStart?: Date
  currentPeriodEnd?: Date
  cancelAtPeriodEnd?: boolean
  
  // ✅ NOVOS CAMPOS PARA FREE VITALÍCIO
  freeRequestsUsed?: number
  freeRequestsLimit?: number
  isFreePlan?: boolean
  isLifetimeFree?: boolean
}

export interface ConsumeResult {
  success: boolean
  remaining?: number
  error?: string
  unlimited?: boolean
  consumed?: number
  totalUsed?: number
  
  // ✅ NOVOS CAMPOS
  isFreePlan?: boolean
  isLifetimeFree?: boolean
  planType?: string
  monthlyLimit?: number
  resetDate?: string | Date
}

// Tipos para retornos das funções RPC do Supabase
export interface ConsumeCreditRPCResult {
  success: boolean
  remaining?: number
  error?: string
  unlimited?: boolean
  used?: number
  total_used?: number
  
  // ✅ NOVOS CAMPOS
  is_free_plan?: boolean
  is_lifetime_free?: boolean
}

export interface SubscriptionStateRPCResult {
  user_id: string
  email: string | null
  name: string
  plan_type: SubscriptionType
  status: string
  stripe_customer_id?: string
  stripe_subscription_id?: string
  current_period_start?: string
  current_period_end?: string
  cancel_at_period_end?: boolean
  monthly_credits: number
  credits_available: number
  credits_used: number
  max_projects: number
  has_multi_user: boolean
  has_html_export: boolean
  has_email_preview: boolean
  has_ai_image_analysis: boolean  // ✅ NOVA FEATURE
  usage_period_start?: string
  usage_period_end?: string
  is_unlimited: boolean
  
  // ✅ NOVOS CAMPOS PARA FREE VITALÍCIO
  free_requests_used?: number
  free_requests_limit?: number
  is_free_plan?: boolean
  is_lifetime_free?: boolean
}

export interface UsageInfo {
  planType: string
  status: string
  usage: {
    used: number
    available: number
    total: number
    unlimited: boolean
    percentage: number
  }
  features: {
    maxProjects: number
    hasMultiUser: boolean
    hasHtmlExport: boolean
    hasEmailPreview: boolean
    hasAiImageAnalysis: boolean  // ✅ NOVA FEATURE
  }
  billing: {
    currentPeriodStart?: Date
    currentPeriodEnd?: Date
    cancelAtPeriodEnd?: boolean
    daysUntilReset: number
  }
  stripe: {
    customerId?: string
    subscriptionId?: string
  }
}

export interface UpgradeInfo {
  currentPlan: string
  reason: 'credits' | 'projects' | 'features' | 'free_limit_reached' | 'ai_image_analysis'  // ✅ Novo tipo
  upgradeOptions: Array<{
    planType: string
    benefits: {
      credits: number | string
      projects?: number | string
      features: string[]
      renewable?: boolean  // ✅ Novo campo
    }
  }>
  message?: string  // ✅ Novo campo
  currentUsage?: {
    credits: string
    projects: number
  }
}

// Type guards para validação
export function isConsumeCreditResult(data: unknown): data is ConsumeCreditRPCResult {
  return (
    typeof data === 'object' &&
    data !== null &&
    'success' in data &&
    typeof (data as any).success === 'boolean'
  )
}

export function isSubscriptionStateResult(data: unknown): data is SubscriptionStateRPCResult {
  return (
    typeof data === 'object' &&
    data !== null &&
    'user_id' in data &&
    'plan_type' in data &&
    'monthly_credits' in data
  )
}

// ✅ EXPORTAR TIPO PARA USO EM OUTROS ARQUIVOS
export { SubscriptionType }