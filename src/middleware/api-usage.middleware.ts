import { Response, NextFunction } from 'express'
import { AuthRequest } from '../types/auth.types'
import { supabase } from '../config/supabase.config'
import { logger } from '../utils/logger'

export const trackAPIUsage = (endpoint: string, tokensUsed: number = 0, cost: number = 0) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const originalJson = res.json

    res.json = function(data: any) {
      if (req.user?.id && res.statusCode < 400) {
        // Execute async operation without awaiting to not block response
        (async () => {
          try {
            await supabase.rpc('increment_api_usage', {
              p_user_id: req.user!.id,
              p_endpoint: endpoint,
              p_tokens: tokensUsed,
              p_cost: cost
            })
          } catch (error) {
            logger.error('Failed to track API usage:', error)
          }
        })()
      }

      return originalJson.call(this, data)
    }

    next()
  }
}

export const trackAIUsage = () => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const originalJson = res.json

    res.json = function(data: any) {
      if (req.user?.id && res.statusCode < 400 && data?.data?.tokensUsed) {
        let tokensUsed = 0
        let costValue = 0

        if (data.data.tokensUsed !== undefined && data.data.tokensUsed !== null) {
          tokensUsed = data.data.tokensUsed
        }

        if (data.data.cost !== undefined && data.data.cost !== null) {
          costValue = data.data.cost
        }

        // Execute async operation without awaiting to not block response
        (async () => {
          try {
            await supabase.rpc('increment_api_usage', {
              p_user_id: req.user!.id,
              p_endpoint: req.path,
              p_tokens: tokensUsed,
              p_cost: costValue
            })
          } catch (error) {
            logger.error('Failed to track AI usage:', error)
          }
        })()
      }

      return originalJson.call(this, data)
    }

    next()
  }
}
