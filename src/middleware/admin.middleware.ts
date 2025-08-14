import { Response, NextFunction } from 'express'
import { AuthRequest } from '../types/auth.types'
import { HTTP_STATUS } from '../utils/constants'
import { logger } from '../utils/logger'

// Lista de emails de administradores
const ADMIN_EMAILS = [
  'admin@mailtrendz.com',
  'mailtrendz00@gmail.com',
  // Adicione outros emails de admin aqui
]

export const adminOnly = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user

    if (!user) {
      logger.warn('Admin access denied: No user found')
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: 'Acesso negado: usuário não autenticado'
      })
      return
    }

    if (!user.email) {
      logger.warn('Admin access denied: No email found for user:', user.id)
      res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: 'Acesso negado: email não encontrado'
      })
      return
    }

    // Verificar se o email está na lista de admins
    if (!ADMIN_EMAILS.includes(user.email)) {
      logger.warn('Admin access denied for user:', {
        userId: user.id,
        email: user.email
      })
      res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: 'Acesso negado: privilégios de administrador necessários'
      })
      return
    }

    logger.info('Admin access granted for user:', {
      userId: user.id,
      email: user.email
    })

    next()
  } catch (error: any) {
    logger.error('Error in admin middleware:', error)
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Erro interno do servidor'
    })
  }
}

export const isSuperAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user

    if (!user || !user.email) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: 'Acesso negado: usuário não autenticado'
      })
      return
    }

    // Super admin é apenas o email principal
    if (user.email !== 'mailtrendz00@gmail.com') {
      logger.warn('Super admin access denied for user:', {
        userId: user.id,
        email: user.email
      })
      res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: 'Acesso negado: privilégios de super administrador necessários'
      })
      return
    }

    logger.info('Super admin access granted for user:', {
      userId: user.id,
      email: user.email
    })

    next()
  } catch (error: any) {
    logger.error('Error in super admin middleware:', error)
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Erro interno do servidor'
    })
  }
}
