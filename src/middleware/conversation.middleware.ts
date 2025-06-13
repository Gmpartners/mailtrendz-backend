import { Request, Response, NextFunction } from 'express'
import { Types } from 'mongoose'
import { Conversation } from '../models/Conversation.model'
import { Project } from '../models/Project.model'
import { HTTP_STATUS } from '../utils/constants'
import { logger } from '../utils/logger'

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string
    email: string
    subscription: string
  }
  conversation?: any
  project?: any
}

/**
 * ✅ MIDDLEWARE: Validar e carregar conversa
 */
export const validateConversation = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { conversationId } = req.params
    const userId = req.user?.userId

    if (!conversationId || !Types.ObjectId.isValid(conversationId)) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'ID da conversa inválido'
      })
      return
    }

    const conversation = await Conversation.findOne({
      _id: conversationId,
      userId: new Types.ObjectId(userId!)
    })

    if (!conversation) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: 'Conversa não encontrada'
      })
      return
    }

    req.conversation = conversation
    next()

  } catch (error: any) {
    logger.error('Validate conversation middleware error:', error)
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Erro interno do servidor'
    })
  }
}

/**
 * ✅ MIDDLEWARE: Validar e carregar projeto
 */
export const validateProject = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { projectId } = req.params
    const userId = req.user?.userId

    if (!projectId || !Types.ObjectId.isValid(projectId)) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'ID do projeto inválido'
      })
      return
    }

    const project = await Project.findOne({
      _id: projectId,
      userId: new Types.ObjectId(userId!)
    })

    if (!project) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: 'Projeto não encontrado'
      })
      return
    }

    req.project = project
    next()

  } catch (error: any) {
    logger.error('Validate project middleware error:', error)
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Erro interno do servidor'
    })
  }
}

/**
 * ✅ MIDDLEWARE: Validar projeto e carregar conversa
 */
export const validateProjectAndConversation = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { projectId } = req.params
    const userId = req.user?.userId

    if (!projectId || !Types.ObjectId.isValid(projectId)) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'ID do projeto inválido'
      })
      return
    }

    // Carregar projeto
    const project = await Project.findOne({
      _id: projectId,
      userId: new Types.ObjectId(userId!)
    })

    if (!project) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: 'Projeto não encontrado'
      })
      return
    }

    // Carregar conversa
    const conversation = await Conversation.findOne({
      projectId: new Types.ObjectId(projectId),
      userId: new Types.ObjectId(userId!)
    })

    req.project = project
    req.conversation = conversation

    next()

  } catch (error: any) {
    logger.error('Validate project and conversation middleware error:', error)
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Erro interno do servidor'
    })
  }
}

/**
 * ✅ MIDDLEWARE: Rate limiting para conversas
 */
export const conversationRateLimit = (
  maxMessages: number = 100,
  windowMs: number = 60000
) => {
  const messageCount = new Map<string, { count: number; resetTime: number }>()

  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId
      const now = Date.now()
      const key = `conversation_${userId}`

      // Limpar entradas expiradas
      for (const [k, v] of messageCount.entries()) {
        if (now > v.resetTime) {
          messageCount.delete(k)
        }
      }

      // Verificar limite atual
      const current = messageCount.get(key)
      
      if (!current) {
        messageCount.set(key, { count: 1, resetTime: now + windowMs })
        next()
        return
      }

      if (current.count >= maxMessages) {
        const remainingTime = Math.ceil((current.resetTime - now) / 1000)
        
        res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
          success: false,
          message: `Limite de mensagens excedido. Tente novamente em ${remainingTime} segundos.`,
          retryAfter: remainingTime
        })
        return
      }

      current.count++
      next()

    } catch (error: any) {
      logger.error('Conversation rate limit middleware error:', error)
      next()
    }
  }
}

/**
 * ✅ MIDDLEWARE: Validar conteúdo da mensagem
 */
export const validateMessageContent = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const { content } = req.body

    if (!content) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Conteúdo da mensagem é obrigatório'
      })
      return
    }

    if (typeof content !== 'string') {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Conteúdo deve ser uma string'
      })
      return
    }

    const trimmedContent = content.trim()

    if (trimmedContent.length === 0) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Conteúdo não pode estar vazio'
      })
      return
    }

    if (trimmedContent.length > 10000) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Conteúdo muito longo (máximo 10.000 caracteres)'
      })
      return
    }

    // Atualizar body com conteúdo limpo
    req.body.content = trimmedContent

    next()

  } catch (error: any) {
    logger.error('Validate message content middleware error:', error)
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Erro interno do servidor'
    })
  }
}

/**
 * ✅ MIDDLEWARE: Verificar saúde do Python AI Service
 */
export const checkPythonAIHealth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const pythonServiceUrl = process.env.PYTHON_AI_SERVICE_URL

    if (!pythonServiceUrl) {
      res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({
        success: false,
        message: 'Serviço Python AI não configurado'
      })
      return
    }

    // Health check rápido
    try {
      const response = await fetch(`${pythonServiceUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      })

      if (!response.ok) {
        throw new Error(`Python AI Service unhealthy: ${response.status}`)
      }

      next()

    } catch (healthError: any) {
      logger.warn(`Python AI Service health check failed: ${healthError.message}`)
      
      res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({
        success: false,
        message: 'Serviço de IA temporariamente indisponível',
        fallbackAvailable: true,
        retryAfter: 30
      })
    }

  } catch (error: any) {
    logger.error('Check Python AI health middleware error:', error)
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Erro interno do servidor'
    })
  }
}

/**
 * ✅ MIDDLEWARE: Log de atividade de conversa
 */
export const logConversationActivity = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const userId = req.user?.userId
    const projectId = req.params.projectId || req.project?._id
    const conversationId = req.params.conversationId || req.conversation?._id
    const action = req.method
    const path = req.path

    logger.info('Conversation activity:', {
      userId,
      projectId,
      conversationId,
      action,
      path,
      timestamp: new Date(),
      userAgent: req.get('User-Agent'),
      ip: req.ip
    })

    next()

  } catch (error: any) {
    logger.error('Log conversation activity middleware error:', error)
    next()
  }
}

export default {
  validateConversation,
  validateProject,
  validateProjectAndConversation,
  conversationRateLimit,
  validateMessageContent,
  checkPythonAIHealth,
  logConversationActivity
}