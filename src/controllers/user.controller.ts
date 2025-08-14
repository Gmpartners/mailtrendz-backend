import { Response } from 'express'
import { AuthRequest } from '../types/auth.types'
import { supabase } from '../config/supabase.config'
import StorageService from '../services/supabase/storage.service'
import subscriptionService from '../services/subscription.service'
import { HTTP_STATUS } from '../utils/constants'
import { asyncHandler } from '../middleware/error.middleware'
import { logger } from '../utils/logger'

// ✅ NOVO: Type guard para validar tipos de projeto
function isValidProjectType(type: string): type is 'campaign' | 'newsletter' | 'transactional' | 'notification' | 'other' {
  return ['campaign', 'newsletter', 'transactional', 'notification', 'other'].includes(type)
}

class UserController {
  getProfile = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.user!.id

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error || !profile) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: 'Perfil não encontrado'
      })
      return
    }

    const { data: usage } = await supabase
      .from('user_api_usage_summary')
      .select('*')
      .eq('user_id', userId)
      .gte('month', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
      .single()

    // Obter informações de créditos do subscription service
    const usageInfo = await subscriptionService.getUsageInfo(userId)
    const creditsBalance = usageInfo ? {
      available: usageInfo.usage.available,
      used: usageInfo.usage.used,
      total: usageInfo.usage.total,
      unlimited: usageInfo.usage.unlimited,
      resetAt: usageInfo.billing.currentPeriodEnd
    } : null

    // ✅ CORRIGIDO: Verificar se api_usage_limit não é null
    const apiUsageLimit = profile.api_usage_limit || 50
    
    const profileData = {
      ...profile,
      apiUsage: {
        currentMonth: usage?.request_count || 0,
        limit: apiUsageLimit,
        percentage: Math.round(((usage?.request_count || 0) / apiUsageLimit) * 100),
        resetDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
      },
      creditsBalance
    }

    res.json({
      success: true,
      data: { user: profileData }
    })
  })

  updateProfile = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.user!.id
    const { name, preferences } = req.body

    const updates: any = {}
    if (name) updates.name = name
    if (preferences) updates.preferences = preferences

    const { data: profile, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()

    if (error || !profile) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Erro ao atualizar perfil'
      })
      return
    }

    res.json({
      success: true,
      message: 'Perfil atualizado com sucesso',
      data: { user: profile }
    })
  })

  uploadAvatar = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.user!.id
    const file = (req as any).file

    if (!file) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Arquivo não enviado'
      })
      return
    }

    try {
      const result = await StorageService.uploadAvatar(
        userId,
        file.buffer,
        file.mimetype
      )

      res.json({
        success: true,
        message: 'Avatar atualizado com sucesso',
        data: {
          url: result.url,
          path: result.path
        }
      })
    } catch (error) {
      logger.error('Avatar upload error:', error)
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro ao fazer upload do avatar'
      })
    }
  })

  deleteAvatar = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.user!.id

    const { error } = await supabase
      .from('profiles')
      .update({ avatar: null })
      .eq('id', userId)

    if (error) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro ao remover avatar'
      })
      return
    }

    res.json({
      success: true,
      message: 'Avatar removido com sucesso'
    })
  })

  getAPIUsage = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.user!.id

    const { data: currentMonthUsage } = await supabase
      .from('user_api_usage_summary')
      .select('*')
      .eq('user_id', userId)
      .gte('month', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
      .single()

    const { data: profile } = await supabase
      .from('profiles')
      .select('api_usage_limit, subscription')
      .eq('id', userId)
      .single()

    const { data: monthlyUsage } = await supabase
      .from('user_api_usage_summary')
      .select('*')
      .eq('user_id', userId)
      .order('month', { ascending: false })
      .limit(6)

    const { data: endpointUsage } = await supabase
      .from('api_usage_logs')
      .select('endpoint, count')
      .eq('user_id', userId)
      .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())

    const endpointStats: Record<string, number> = {}
    endpointUsage?.forEach(log => {
      endpointStats[log.endpoint] = (endpointStats[log.endpoint] || 0) + 1
    })

    // Obter informações de créditos do subscription service
    const usageInfo = await subscriptionService.getUsageInfo(userId)
    const creditsBalance = usageInfo ? {
      available: usageInfo.usage.available,
      used: usageInfo.usage.used,
      total: usageInfo.usage.total,
      unlimited: usageInfo.usage.unlimited,
      resetAt: usageInfo.billing.currentPeriodEnd
    } : null

    res.json({
      success: true,
      data: {
        current: {
          used: currentMonthUsage?.request_count || 0,
          limit: profile?.api_usage_limit || 50,
          percentage: Math.round(((currentMonthUsage?.request_count || 0) / (profile?.api_usage_limit || 50)) * 100),
          resetDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
        },
        history: monthlyUsage || [],
        endpoints: endpointStats,
        subscription: profile?.subscription || 'free',
        creditsBalance
      }
    })
  })

  getCredits = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.user!.id

    // Obter informações completas de uso
    const usageInfo = await subscriptionService.getUsageInfo(userId)
    
    if (!usageInfo) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: 'Informações de créditos não encontradas'
      })
      return
    }

    res.json({
      success: true,
      data: { 
        credits: {
          available: usageInfo.usage.available,
          used: usageInfo.usage.used,
          total: usageInfo.usage.total,
          unlimited: usageInfo.usage.unlimited,
          resetAt: usageInfo.billing.currentPeriodEnd,
          percentage: usageInfo.usage.percentage,
          daysUntilReset: usageInfo.billing.daysUntilReset
        }
      }
    })
  })

  getStats = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.user!.id

    const { data: projectCount } = await supabase
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)

    const { data: chatCount } = await supabase
      .from('chats')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)

    const { data: recentProjects } = await supabase
      .from('projects_with_stats')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5)

    const { data: topProjects } = await supabase
      .from('projects_with_stats')
      .select('*')
      .eq('user_id', userId)
      .order('views', { ascending: false })
      .limit(5)

    // Obter informações de créditos do subscription service
    const usageInfo = await subscriptionService.getUsageInfo(userId)
    const creditsBalance = usageInfo ? {
      available: usageInfo.usage.available,
      used: usageInfo.usage.used,
      total: usageInfo.usage.total,
      unlimited: usageInfo.usage.unlimited,
      resetAt: usageInfo.billing.currentPeriodEnd
    } : null

    res.json({
      success: true,
      data: {
        totals: {
          projects: projectCount || 0,
          chats: chatCount || 0
        },
        recent: recentProjects || [],
        popular: topProjects || [],
        creditsBalance
      }
    })
  })

  getIndustries = asyncHandler(async (_req: AuthRequest, res: Response): Promise<void> => {
    // ✅ FALLBACK: Como a tabela industries pode não existir, usar lista hardcoded
    const industries = [
      { id: 'technology', name: 'Tecnologia' },
      { id: 'ecommerce', name: 'E-commerce' },
      { id: 'health', name: 'Saúde' },
      { id: 'education', name: 'Educação' },
      { id: 'finance', name: 'Finanças' },
      { id: 'marketing', name: 'Marketing' },
      { id: 'real-estate', name: 'Imóveis' },
      { id: 'food', name: 'Alimentação' },
      { id: 'fashion', name: 'Moda' },
      { id: 'other', name: 'Outros' }
    ]

    res.json({
      success: true,
      data: { industries }
    })
  })

  getTemplates = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    // ✅ CORRIGIDO: Fazer cast adequado dos query parameters
    const industry = req.query.industry as string | undefined
    const type = req.query.type as string | undefined

    // ✅ FALLBACK: Como a tabela templates pode não existir, usar lista hardcoded
    let templates = [
      { 
        id: 'promotional-1', 
        name: 'Promoção de Produto',
        industry: 'ecommerce',
        type: 'campaign',
        content: 'Template promocional básico'
      },
      { 
        id: 'newsletter-1', 
        name: 'Newsletter Semanal',
        industry: 'marketing',
        type: 'newsletter',
        content: 'Template de newsletter'
      },
      { 
        id: 'welcome-1', 
        name: 'Email de Boas-vindas',
        industry: 'general',
        type: 'transactional',
        content: 'Template de boas-vindas'
      }
    ]

    // Filtrar por industry se fornecido
    if (industry && typeof industry === 'string') {
      templates = templates.filter(t => t.industry === industry)
    }

    // Filtrar por type se fornecido e válido
    if (type && typeof type === 'string' && isValidProjectType(type)) {
      templates = templates.filter(t => t.type === type)
    }

    res.json({
      success: true,
      data: { templates }
    })
  })

  systemHealthCheck = asyncHandler(async (_req: AuthRequest, res: Response): Promise<void> => {
    const health = {
      status: 'ok',
      timestamp: new Date(),
      service: 'user',
      version: process.env.npm_package_version || '1.0.0'
    }

    res.json({
      success: true,
      data: health
    })
  })

  getDashboard = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.user!.id

    const [profile, stats, recentActivity] = await Promise.all([
      this.getProfileData(userId),
      this.getUserStats(userId),
      this.getRecentActivity()
    ])

    // Obter informações de créditos do subscription service
    const usageInfo = await subscriptionService.getUsageInfo(userId)
    const creditsBalance = usageInfo ? {
      available: usageInfo.usage.available,
      used: usageInfo.usage.used,
      total: usageInfo.usage.total,
      unlimited: usageInfo.usage.unlimited,
      resetAt: usageInfo.billing.currentPeriodEnd
    } : null

    res.json({
      success: true,
      data: {
        profile,
        stats,
        recentActivity,
        creditsBalance
      }
    })
  })

  getUserSettings = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.user!.id

    // ✅ CORRIGIDO: Selecionar apenas campos que existem na tabela profiles
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, name, email, preferences')
      .eq('id', userId)
      .single()

    if (error) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro ao buscar configurações'
      })
      return
    }

    res.json({
      success: true,
      data: {
        preferences: profile?.preferences || {},
        // ✅ FALLBACK: Como notification_settings pode não existir, usar objeto vazio
        notifications: {}
      }
    })
  })

  updateUserSettings = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.user!.id
    const { preferences } = req.body

    const updates: any = {}
    if (preferences) updates.preferences = preferences
    // ✅ REMOVIDO: notifications update pois o campo pode não existir

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)

    if (error) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro ao atualizar configurações'
      })
      return
    }

    res.json({
      success: true,
      message: 'Configurações atualizadas com sucesso'
    })
  })



  exportUserData = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.user!.id

    const [profile, projects, chats] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('projects').select('*').eq('user_id', userId),
      supabase.from('chats').select('*').eq('user_id', userId)
    ])

    const exportData = {
      profile: profile.data,
      projects: projects.data || [],
      chats: chats.data || [],
      exportedAt: new Date().toISOString()
    }

    res.json({
      success: true,
      data: exportData
    })
  })

  deleteAccount = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.user!.id
    const { password } = req.body

    if (!password) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Senha é obrigatória para deletar a conta'
      })
      return
    }

    logger.warn(`Account deletion requested for user: ${userId}`)

    res.json({
      success: true,
      message: 'Solicitação de exclusão recebida. Entre em contato com o suporte.'
    })
  })

  private async getProfileData(userId: string) {
    const { data } = await supabase
      .from('profiles')
      .select('id, email, name, avatar, subscription')
      .eq('id', userId)
      .single()
    return data
  }

  private async getUserStats(userId: string) {
    const [projects, chats] = await Promise.all([
      supabase.from('projects').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('chats').select('id', { count: 'exact', head: true }).eq('user_id', userId)
    ])

    return {
      totalProjects: projects.count || 0,
      totalChats: chats.count || 0
    }
  }

  private async getRecentActivity() {
    return []
  }
}

export default new UserController()