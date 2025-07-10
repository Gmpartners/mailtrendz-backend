import { supabase } from '../config/supabase.config'
import { logger } from '../utils/logger'

interface CreditsBalance {
  available: number
  used: number
  total: number
  resetAt: Date | null
  unlimited: boolean
}

class CreditsService {
  async checkCredits(userId: string): Promise<boolean> {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription')
        .eq('id', userId)
        .single()

      if (!profile) {
        return false
      }

      if (profile.subscription === 'unlimited') {
        return true
      }

      const { data: credits } = await supabase
        .from('ai_credits')
        .select('credits_available')
        .eq('user_id', userId)
        .single()

      return credits?.credits_available > 0
    } catch (error: any) {
      logger.error('Error checking credits:', error)
      return false
    }
  }

  async consumeCredit(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('consume_ai_credit', {
        p_user_id: userId
      })

      if (error) {
        logger.error('Error consuming credit:', error)
        return false
      }

      logger.info('Credit consumed:', { userId, success: data })
      return data || false
    } catch (error: any) {
      logger.error('Error consuming credit:', error)
      return false
    }
  }

  async getCreditsBalance(userId: string): Promise<CreditsBalance> {
    try {
      const { data: userInfo } = await supabase
        .from('user_subscription_info')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (!userInfo) {
        return {
          available: 0,
          used: 0,
          total: 0,
          resetAt: null,
          unlimited: false
        }
      }

      const isUnlimited = userInfo.plan_type === 'unlimited'
      const total = userInfo.plan_credits || 0

      return {
        available: isUnlimited ? 999999 : (userInfo.credits_available || 0),
        used: userInfo.credits_used || 0,
        total: isUnlimited ? 999999 : total,
        resetAt: userInfo.credits_reset_at ? new Date(userInfo.credits_reset_at) : null,
        unlimited: isUnlimited
      }
    } catch (error: any) {
      logger.error('Error getting credits balance:', error)
      return {
        available: 0,
        used: 0,
        total: 0,
        resetAt: null,
        unlimited: false
      }
    }
  }

  async resetCredits(userId: string): Promise<void> {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription')
        .eq('id', userId)
        .single()

      if (!profile) {
        throw new Error('User not found')
      }

      await supabase.rpc('initialize_user_credits', {
        p_user_id: userId,
        p_plan_type: profile.subscription
      })

      logger.info('Credits reset:', { userId, planType: profile.subscription })
    } catch (error: any) {
      logger.error('Error resetting credits:', error)
      throw error
    }
  }

  async initializeCreditsForNewUser(userId: string, planType: string = 'free'): Promise<void> {
    try {
      await supabase.rpc('initialize_user_credits', {
        p_user_id: userId,
        p_plan_type: planType
      })

      logger.info('Credits initialized for new user:', { userId, planType })
    } catch (error: any) {
      logger.error('Error initializing credits:', error)
      throw error
    }
  }

  async resetMonthlyCredits(): Promise<void> {
    try {
      const currentDate = new Date()
      
      const { data: usersToReset } = await supabase
        .from('ai_credits')
        .select('user_id')
        .lte('reset_at', currentDate.toISOString())
        .not('reset_at', 'is', null)

      if (!usersToReset || usersToReset.length === 0) {
        logger.info('No users need credit reset')
        return
      }

      for (const user of usersToReset) {
        await this.resetCredits(user.user_id)
      }

      logger.info('Monthly credits reset completed:', { 
        usersCount: usersToReset.length 
      })
    } catch (error: any) {
      logger.error('Error in monthly credits reset:', error)
      throw error
    }
  }
}

export default new CreditsService()