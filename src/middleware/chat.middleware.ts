import { Response, NextFunction } from 'express'
import { AuthRequest } from '../types/auth.types'
import ChatService from '../services/chat.service'
import { HTTP_STATUS } from '../utils/constants'
import { logger } from '../utils/logger'

function getUserToken(req: AuthRequest): string | undefined {
  const authHeader = req.headers.authorization
  return authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined
}

export const ensureUniqueChat = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { projectId } = req.body
  const userId = req.user!.id
  const userToken = getUserToken(req)

  // Se não há projectId, permitir criação normal
  if (!projectId) {
    return next()
  }

  try {
    logger.info('🔍 Verificando chat único para projeto', {
      userId,
      projectId,
      middleware: 'ensureUniqueChat'
    })

    const existingChat = await ChatService.getChatByProjectId(projectId, userId, userToken)
    
    if (existingChat) {
      logger.info('✅ Chat existente encontrado - retornando via middleware', {
        existingChatId: existingChat.id,
        projectId,
        userId,
        title: existingChat.title
      })

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Chat já existe para este projeto',
        data: { 
          chat: existingChat,
          meta: {
            wasExisting: true,
            action: 'retrieved_existing',
            source: 'middleware'
          }
        }
      })
    }

    // Se não existe, continuar para criação
    logger.info('🆕 Nenhum chat existente - permitindo criação', {
      userId,
      projectId
    })
    
    next()
  } catch (error: any) {
    logger.error('❌ Erro no middleware ensureUniqueChat', {
      error: error.message,
      userId,
      projectId,
      stack: error.stack
    })
    
    // Em caso de erro, permitir que continue (fail-safe)
    next()
  }
}

export const validateChatAccess = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const chatId = req.params.id || req.body.chat_id
  const userId = req.user!.id
  const userToken = getUserToken(req)

  if (!chatId) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: 'Chat ID é obrigatório'
    })
    return
  }

  try {
    const chat = await ChatService.getChatById(chatId, userId, userToken)
    
    if (!chat) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: 'Chat não encontrado'
      })
      return
    }

    // Adicionar chat ao request para uso posterior
    req.chat = chat
    next()
  } catch (error: any) {
    logger.error('❌ Erro na validação de acesso ao chat', {
      error: error.message,
      chatId,
      userId
    })
    
    res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      message: 'Acesso negado ao chat'
    })
  }
}