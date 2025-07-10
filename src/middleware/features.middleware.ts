import { Response, NextFunction } from 'express'
import { AuthRequest } from '../types/auth.types'
import { supabase } from '../config/supabase.config'
import { HTTP_STATUS } from '../utils/constants'
import { logger } from '../utils/logger'

type Feature = 'has_folders' | 'has_multi_user' | 'has_html_export' | 'has_email_preview'

export const requireFeature = (feature: Feature) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: 'Autenticação requerida'
        })
        return
      }

      const { data: hasFeature } = await supabase.rpc('user_has_feature', {
        p_user_id: req.user.id,
        p_feature: feature
      })

      if (!hasFeature) {
        const featureNames: Record<Feature, string> = {
          has_folders: 'Pastas',
          has_multi_user: 'Multi-usuário',
          has_html_export: 'Exportação de HTML',
          has_email_preview: 'Visualização de email'
        }

        res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          message: `Recurso "${featureNames[feature]}" não disponível no seu plano`,
          error: {
            code: 'FEATURE_NOT_AVAILABLE',
            feature: feature,
            currentPlan: req.user.subscription
          }
        })
        return
      }

      next()
    } catch (error: any) {
      logger.error('Feature check error:', error)
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro ao verificar permissões'
      })
    }
  }
}

export const checkProjectLimit = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: 'Autenticação requerida'
      })
      return
    }

    const { data: planFeatures } = await supabase
      .from('plan_features')
      .select('max_projects')
      .eq('plan_type', req.user.subscription)
      .single()

    if (planFeatures?.max_projects) {
      const { count } = await supabase
        .from('projects')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', req.user.id)

      if (count && count >= planFeatures.max_projects) {
        res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          message: `Limite de ${planFeatures.max_projects} projetos atingido para o plano ${req.user.subscription}`,
          error: {
            code: 'PROJECT_LIMIT_REACHED',
            currentCount: count,
            limit: planFeatures.max_projects,
            plan: req.user.subscription
          }
        })
        return
      }
    }

    next()
  } catch (error: any) {
    logger.error('Project limit check error:', error)
    next()
  }
}

export default {
  requireFeature,
  checkProjectLimit
}