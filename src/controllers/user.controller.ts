import { Response } from 'express'
import mongoose from 'mongoose'
import { AuthRequest } from '../types/auth.types'
import { User } from '../models/User.model'
import { Project, IProjectDocument } from '../models/Project.model'
import { Chat, IChatDocument } from '../models/Chat.model'
import { Message } from '../models/Message.model'
import Database from '../config/database.config'
import AIService from '../services/ai.service'
import { HTTP_STATUS } from '../utils/constants'
import { logger } from '../utils/logger'
import { asyncHandler } from '../middleware/error.middleware'

// Estender os tipos dos modelos para incluir métodos estáticos
interface ProjectModelType extends mongoose.Model<IProjectDocument> {
  getUserStats(userId: string): Promise<any>
}

interface ChatModelType extends mongoose.Model<IChatDocument> {
  getUserStats(userId: string): Promise<any>
  getActiveChats(userId: string): Promise<any>
}

// Usar type assertion para os modelos
const ProjectModel = Project as ProjectModelType
const ChatModel = Chat as ChatModelType

class UserController {
  // Dashboard do usuário com estatísticas gerais
  getDashboard = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id

    // Buscar estatísticas do usuário
    const [userStats, projectStats, chatStats] = await Promise.all([
      User.findById(userId).select('apiUsage subscription createdAt'),
      ProjectModel.getUserStats(userId),
      ChatModel.getUserStats(userId)
    ])

    // Projetos recentes
    const recentProjects = await Project.find({ userId })
      .sort({ updatedAt: -1 })
      .limit(5)
      .select('name type createdAt updatedAt')

    // Chats ativos
    const activeChats = await ChatModel.getActiveChats(userId)

    const dashboard = {
      user: {
        subscription: userStats?.subscription || 'free',
        memberSince: userStats?.createdAt,
        apiUsage: userStats?.apiUsage || { currentMonth: 0, limit: 10, percentage: 0 }
      },
      projects: {
        total: projectStats?.totalProjects || 0,
        thisMonth: 0, // Calcular baseado em createdAt
        avgConversion: projectStats?.avgConversion || 0,
        recent: recentProjects
      },
      chats: {
        total: chatStats?.totalChats || 0,
        active: chatStats?.activeChats || 0,
        totalMessages: chatStats?.totalMessages || 0,
        recent: activeChats.slice(0, 3)
      },
      activity: {
        emailsGenerated: projectStats?.totalProjects || 0,
        emailsImproved: chatStats?.totalEmailUpdates || 0,
        totalInteractions: (projectStats?.totalOpens || 0) + (projectStats?.totalClicks || 0)
      }
    }

    res.json({
      success: true,
      data: { dashboard }
    })
  })

  // Buscar notificações do usuário
  getNotifications = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id
    const user = await User.findById(userId)

    // Notificações baseadas no estado do usuário
    const notifications = []

    if (user) {
      // Verificação de email
      if (!user.isEmailVerified) {
        notifications.push({
          id: 'email-verification',
          type: 'warning',
          title: 'Verificação de Email Pendente',
          message: 'Verifique seu email para ativar todas as funcionalidades',
          action: {
            label: 'Reenviar Email',
            endpoint: '/api/auth/resend-verification'
          },
          priority: 'high',
          createdAt: new Date()
        })
      }

      // Limite de API próximo
      const usagePercentage = user.getAPIUsagePercentage()
      if (usagePercentage >= 80) {
        notifications.push({
          id: 'api-limit-warning',
          type: 'warning',
          title: 'Limite de API Próximo',
          message: `Você usou ${usagePercentage}% do seu limite mensal`,
          action: user.subscription === 'free' ? {
            label: 'Fazer Upgrade',
            endpoint: '/api/subscription/upgrade'
          } : undefined,
          priority: 'medium',
          createdAt: new Date()
        })
      }

      // Boas-vindas para novos usuários
      const isNewUser = (Date.now() - user.createdAt.getTime()) < (7 * 24 * 60 * 60 * 1000)
      if (isNewUser) {
        notifications.push({
          id: 'welcome',
          type: 'info',
          title: 'Bem-vindo ao MailTrendz!',
          message: 'Comece criando seu primeiro email com IA',
          action: {
            label: 'Criar Email',
            endpoint: '/dashboard'
          },
          priority: 'low',
          createdAt: user.createdAt
        })
      }
    }

    res.json({
      success: true,
      data: { notifications }
    })
  })

  // Marcar notificação como lida
  markNotificationRead = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { notificationId } = req.params

    // Em implementação real, seria salvo no banco
    logger.info('Notification marked as read', { 
      userId: req.user!.id, 
      notificationId 
    })

    res.json({
      success: true,
      message: 'Notificação marcada como lida'
    })
  })

  // Buscar configurações do usuário
  getUserSettings = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id
    const user = await User.findById(userId)

    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: 'Usuário não encontrado'
      })
    }

    const settings = {
      profile: {
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        isEmailVerified: user.isEmailVerified
      },
      preferences: user.preferences,
      subscription: {
        plan: user.subscription,
        apiUsage: user.apiUsage
      },
      notifications: {
        email: true,
        push: false,
        marketing: true
      },
      privacy: {
        publicProfile: false,
        shareStats: false
      }
    }

    res.json({
      success: true,
      data: { settings }
    })
  })

  // Atualizar configurações do usuário
  updateUserSettings = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id
    const { preferences, notifications, privacy } = req.body

    const user = await User.findById(userId)
    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: 'Usuário não encontrado'
      })
    }

    // Atualizar preferências
    if (preferences) {
      user.preferences = { ...user.preferences, ...preferences }
    }

    // Notificações e privacidade seriam salvos em tabela separada
    // Por enquanto só logamos
    if (notifications) {
      logger.info('User notifications updated', { userId, notifications })
    }

    if (privacy) {
      logger.info('User privacy settings updated', { userId, privacy })
    }

    await user.save()

    res.json({
      success: true,
      message: 'Configurações atualizadas com sucesso!'
    })
  })

  // Deletar conta do usuário
  deleteAccount = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id
    const { password, confirmation } = req.body

    if (confirmation !== 'DELETE') {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Confirmação incorreta. Digite "DELETE" para confirmar'
      })
    }

    const user = await User.findById(userId).select('+password')
    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: 'Usuário não encontrado'
      })
    }

    // Verificar senha
    const isPasswordValid = await user.comparePassword(password)
    if (!isPasswordValid) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: 'Senha incorreta'
      })
    }

    // Deletar todos os dados do usuário
    await Promise.all([
      Message.deleteMany({ chatId: { $in: await Chat.find({ userId }).distinct('_id') } }),
      Chat.deleteMany({ userId }),
      Project.deleteMany({ userId }),
      User.findByIdAndDelete(userId)
    ])

    logger.info('User account deleted', { userId, email: user.email })

    res.json({
      success: true,
      message: 'Conta deletada com sucesso'
    })
  })

  // Exportar dados do usuário (LGPD/GDPR)
  exportUserData = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id

    const [user, projects, chats] = await Promise.all([
      User.findById(userId),
      Project.find({ userId }),
      Chat.find({ userId }).populate('messages')
    ])

    const exportData = {
      user: user?.fullProfile,
      projects: projects.map(p => ({
        id: p._id,
        name: p.name,
        type: p.type,
        content: p.content,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt
      })),
      chats: chats.map(c => ({
        id: c._id,
        title: c.title,
        createdAt: c.createdAt,
        messageCount: c.metadata.totalMessages
      })),
      exportedAt: new Date(),
      version: '1.0'
    }

    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Disposition', `attachment; filename="mailtrendz-data-${userId}.json"`)
    res.json(exportData)
  })

  // Health check geral do sistema
  systemHealthCheck = asyncHandler(async (req: AuthRequest, res: Response) => {
    const [dbHealth, aiHealth] = await Promise.all([
      Database.healthCheck(),
      AIService.healthCheck()
    ])

    const memoryUsage = process.memoryUsage()
    const uptime = process.uptime()

    const health = {
      status: 'ok',
      timestamp: new Date(),
      uptime: Math.floor(uptime),
      version: process.env.npm_package_version || '1.0.0',
      services: {
        database: dbHealth,
        ai: aiHealth
      },
      memory: {
        used: Math.round(memoryUsage.heapUsed / 1024 / 1024 * 100) / 100,
        total: Math.round(memoryUsage.heapTotal / 1024 / 1024 * 100) / 100,
        percentage: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100)
      },
      environment: process.env.NODE_ENV || 'development'
    }

    res.json({
      success: true,
      data: health
    })
  })
}

export default new UserController()