import { Response } from 'express'
import { AuthRequest } from '../types/auth.types'
import { supabase } from '../config/supabase.config'
import StorageService from '../services/supabase/storage.service'
import { HTTP_STATUS } from '../utils/constants'
import { asyncHandler } from '../middleware/error.middleware'
import { logger } from '../utils/logger'

class UserController {
  getProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
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

    const profileData = {
      ...profile,
      apiUsage: {
        currentMonth: usage?.request_count || 0,
        limit: profile.api_usage_limit,
        percentage: Math.round(((usage?.request_count || 0) / profile.api_usage_limit) * 100),
        resetDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
      }
    }

    res.json({
      success: true,
      data: { user: profileData }
    })
  })

  updateProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
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

  uploadAvatar = asyncHandler(async (req: AuthRequest, res: Response) => {
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

  deleteAvatar = asyncHandler(async (req: AuthRequest, res: Response) => {
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

  getAPIUsage = asyncHandler(async (req: AuthRequest, res: Response) => {
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
        subscription: profile?.subscription || 'free'
      }
    })
  })

  getStats = asyncHandler(async (req: AuthRequest, res: Response) => {
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

    res.json({
      success: true,
      data: {
        totals: {
          projects: projectCount || 0,
          chats: chatCount || 0
        },
        recent: recentProjects || [],
        popular: topProjects || []
      }
    })
  })

  getIndustries = asyncHandler(async (_req: AuthRequest, res: Response) => {
    const { data: industries, error } = await supabase
      .from('industries')
      .select('*')
      .order('name')

    if (error) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro ao buscar indústrias'
      })
      return
    }

    res.json({
      success: true,
      data: { industries }
    })
  })

  getTemplates = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { industry, type } = req.query

    let query = supabase
      .from('templates')
      .select('*')

    if (industry) {
      query = query.eq('industry', industry)
    }

    if (type) {
      query = query.eq('type', type)
    }

    const { data: templates, error } = await query.order('usage_count', { ascending: false })

    if (error) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro ao buscar templates'
      })
      return
    }

    res.json({
      success: true,
      data: { templates }
    })
  })

  // Métodos adicionais para compatibilidade com rotas
  systemHealthCheck = asyncHandler(async (_req: AuthRequest, res: Response) => {
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

  getDashboard = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id

    const [profile, stats, recentActivity] = await Promise.all([
      this.getProfileData(userId),
      this.getUserStats(userId),
      this.getRecentActivity(userId)
    ])

    res.json({
      success: true,
      data: {
        profile,
        stats,
        recentActivity
      }
    })
  })

  getUserSettings = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('preferences, notification_settings')
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
        notifications: profile?.notification_settings || {}
      }
    })
  })

  updateUserSettings = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id
    const { preferences, notifications } = req.body

    const updates: any = {}
    if (preferences) updates.preferences = preferences
    if (notifications) updates.notification_settings = notifications

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

  getNotifications = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id
    const { unread } = req.query

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (unread === 'true') {
      query = query.eq('read', false)
    }

    const { data: notifications, error } = await query

    if (error) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro ao buscar notificações'
      })
      return
    }

    res.json({
      success: true,
      data: { notifications: notifications || [] }
    })
  })

  markNotificationRead = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id
    const { id } = req.params

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id)
      .eq('user_id', userId)

    if (error) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro ao marcar notificação como lida'
      })
      return
    }

    res.json({
      success: true,
      message: 'Notificação marcada como lida'
    })
  })

  exportUserData = asyncHandler(async (req: AuthRequest, res: Response) => {
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

  deleteAccount = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id
    const { password } = req.body

    if (!password) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Senha é obrigatória para deletar a conta'
      })
      return
    }

    // Note: Em produção, verificar a senha antes de deletar
    logger.warn(`Account deletion requested for user: ${userId}`)

    res.json({
      success: true,
      message: 'Solicitação de exclusão recebida. Entre em contato com o suporte.'
    })
  })

  // Métodos auxiliares privados
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

  private async getRecentActivity(userId: string) {
    const { data } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10)

    return data || []
  }
}

export default new UserController()
