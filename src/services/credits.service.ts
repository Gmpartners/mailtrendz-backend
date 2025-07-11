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
      const balance = await this.getCreditsBalance(userId)
      return balance.unlimited || balance.available > 0
    } catch (error: any) {
      logger.error('Error checking credits:', error)
      return false
    }
  }

  async consumeCredit(userId: string): Promise<boolean> {
    return this.useCredits(userId, 1)
  }

  async useCredits(userId: string, amount: number): Promise<boolean> {
    try {
      logger.info('Using credits:', { userId, amount })

      // Buscar informações atuais do usuário
      const { data: userInfo, error: userError } = await supabase
        .from('user_subscription_info')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (userError || !userInfo) {
        logger.warn('User not found in subscription info, initializing...', { userId })
        
        // Inicializar usuário
        const { error: initError } = await supabase
          .from('user_subscription_info')
          .insert({
            user_id: userId,
            plan_type: 'free',
            plan_credits: 3,
            credits_available: Math.max(0, 3 - amount),
            credits_used: amount,
            subscription_status: 'active',
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            has_folders: false,
            has_multi_user: false,
            has_html_export: false,
            has_email_preview: false,
            max_projects: 3
          })

        if (initError) {
          logger.error('Error initializing user credits:', initError)
          return false
        }

        logger.info('User credits initialized successfully:', { userId, amount })
        return amount <= 3
      }

      // Se é plano unlimited, sempre permitir
      if (userInfo.plan_type === 'unlimited') {
        // Apenas atualizar o contador de uso
        const { error: updateError } = await supabase
          .from('user_subscription_info')
          .update({
            credits_used: (userInfo.credits_used || 0) + amount,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)

        if (updateError) {
          logger.error('Error updating unlimited plan usage:', updateError)
          return false
        }

        logger.info('Unlimited plan, credits consumed:', { userId, amount })
        return true
      }

      const currentCredits = userInfo.credits_available || 0

      // Verificar se tem créditos suficientes
      if (currentCredits < amount) {
        logger.warn('Insufficient credits:', { 
          userId, 
          available: currentCredits, 
          requested: amount 
        })
        return false
      }

      // Consumir créditos
      const { error: updateError } = await supabase
        .from('user_subscription_info')
        .update({
          credits_available: Math.max(0, currentCredits - amount),
          credits_used: (userInfo.credits_used || 0) + amount,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)

      if (updateError) {
        logger.error('Error consuming credits:', updateError)
        return false
      }

      logger.info('Credits consumed successfully:', { 
        userId, 
        amount, 
        newAvailable: Math.max(0, currentCredits - amount)
      })

      return true
    } catch (error: any) {
      logger.error('Error using credits:', error)
      return false
    }
  }

  async getCreditsBalance(userId: string): Promise<CreditsBalance> {
    try {
      const { data: userInfo, error } = await supabase
        .from('user_subscription_info')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error || !userInfo) {
        // Se não encontrou, inicializar como usuário free
        logger.warn('User not found in subscription info, returning default free balance')
        
        return {
          available: 3,
          used: 0,
          total: 3,
          resetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          unlimited: false
        }
      }

      const isUnlimited = userInfo.plan_type === 'unlimited'
      const total = userInfo.plan_credits || 3

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
      const { data: userInfo } = await supabase
        .from('user_subscription_info')
        .select('plan_type, plan_credits')
        .eq('user_id', userId)
        .single()

      if (!userInfo) {
        throw new Error('User not found')
      }

      const planCredits = userInfo.plan_credits || 3

      const { error } = await supabase
        .from('user_subscription_info')
        .update({
          credits_available: planCredits,
          credits_used: 0,
          credits_reset_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)

      if (error) {
        throw error
      }

      logger.info('Credits reset:', { userId, planType: userInfo.plan_type, resetTo: planCredits })
    } catch (error: any) {
      logger.error('Error resetting credits:', error)
      throw error
    }
  }

  async initializeCreditsForNewUser(userId: string, planType: string = 'free'): Promise<void> {
    try {
      const planCredits = this.getPlanCredits(planType)
      
      const { error } = await supabase
        .from('user_subscription_info')
        .insert({
          user_id: userId,
          plan_type: planType,
          plan_credits: planCredits,
          credits_available: planCredits,
          credits_used: 0,
          subscription_status: 'active',
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          credits_reset_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          has_folders: ['enterprise', 'unlimited'].includes(planType),
          has_multi_user: ['enterprise', 'unlimited'].includes(planType),
          has_html_export: planType !== 'free',
          has_email_preview: planType !== 'free',
          max_projects: this.getPlanMaxProjects(planType)
        })

      if (error) {
        throw error
      }

      logger.info('Credits initialized for new user:', { userId, planType, credits: planCredits })
    } catch (error: any) {
      logger.error('Error initializing credits:', error)
      throw error
    }
  }

  private getPlanCredits(planType: string): number {
    switch (planType) {
      case 'pro': return 20
      case 'enterprise': return 50
      case 'unlimited': return 999999
      default: return 3 // free
    }
  }

  private getPlanMaxProjects(planType: string): number {
    switch (planType) {
      case 'pro': return 50
      case 'enterprise': return 100
      case 'unlimited': return 999999
      default: return 3 // free
    }
  }

  async resetMonthlyCredits(): Promise<void> {
    try {
      const currentDate = new Date()
      
      const { data: usersToReset, error } = await supabase
        .from('user_subscription_info')
        .select('user_id, plan_type, plan_credits')
        .lte('credits_reset_at', currentDate.toISOString())
        .not('credits_reset_at', 'is', null)

      if (error) {
        throw error
      }

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
