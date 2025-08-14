import { supabaseAdmin } from '../config/supabase.config'
import { logger } from '../utils/logger'
import { ApiError } from '../utils/api-error'
import { HTTP_STATUS } from '../utils/constants'

interface IpTrackingData {
  userId: string
  ipAddress: string
  userAgent?: string
  provider?: string
  isSignup?: boolean
}

class IpTrackingService {
  /**
   * Registra ou atualiza o IP de um usuário
   */
  async trackUserIp(data: IpTrackingData): Promise<void> {
    console.log('🔍 [IP-TRACKING] trackUserIp called with:', data)
    
    try {
      const { userId, ipAddress, userAgent, provider, isSignup = false } = data

      // Log detalhado do IP recebido
      logger.info('IP Tracking attempt:', {
        userId,
        ipAddress,
        userAgent,
        provider,
        isSignup
      })

      // Não rastrear IPs inválidos (mas permitir localhost em dev)
      if (!ipAddress || ipAddress === 'unknown') {
        logger.warn('Invalid IP address for tracking:', { userId, ipAddress })
        return
      }

      // Em desenvolvimento, converter ::1 para 127.0.0.1
      const normalizedIp = ipAddress === '::1' ? '127.0.0.1' : ipAddress

      // Verificar se o IP já está em uso por outro usuário (apenas para signup com email)
      if (isSignup && (!provider || provider === 'email')) {
        const { data: existingTracking } = await supabaseAdmin
          .from('user_ip_tracking')
          .select('user_id')
          .eq('ip_address', normalizedIp)
          .neq('user_id', userId)
          .single()

        if (existingTracking) {
          throw new ApiError(
            'Este IP já está em uso por outra conta',
            HTTP_STATUS.FORBIDDEN
          )
        }
      }

      // Registrar ou atualizar o tracking
      const { error: upsertError } = await supabaseAdmin
        .from('user_ip_tracking')
        .upsert({
          user_id: userId,
          ip_address: normalizedIp,
          user_agent: userAgent,
          signup_ip: isSignup,
          last_seen: new Date().toISOString(),
          login_count: 1,
          provider: provider || 'email'
        })

      if (upsertError) {
        // Se for conflito de unique constraint, incrementar o login_count
        if (upsertError.code === '23505') {
          const { data: existing } = await supabaseAdmin
            .from('user_ip_tracking')
            .select('login_count')
            .match({ user_id: userId, ip_address: normalizedIp })
            .single()

          const { error: updateError } = await supabaseAdmin
            .from('user_ip_tracking')
            .update({
              last_seen: new Date().toISOString(),
              login_count: (existing?.login_count || 0) + 1
            })
            .match({ user_id: userId, ip_address: normalizedIp })

          if (updateError) {
            logger.error('Error updating IP tracking:', updateError)
          }
        } else {
          logger.error('Error upserting IP tracking:', upsertError)
        }
      }

      // Log da ação
      await this.logAction({
        action: isSignup ? 'user_signup' : 'user_login',
        userId,
        ipAddress: normalizedIp,
        details: {
          provider: provider || 'email',
          userAgent,
          timestamp: new Date().toISOString()
        }
      })

      logger.info('IP tracked successfully:', {
        userId,
        ipAddress: normalizedIp,
        provider,
        isSignup
      })
    } catch (error) {
      logger.error('Error tracking user IP:', error)
      throw error
    }
  }

  /**
   * Verifica se um IP está bloqueado
   */
  async isIpBlocked(ipAddress: string): Promise<{ blocked: boolean; reason?: string }> {
    try {
      const { data: blacklistEntry } = await supabaseAdmin
        .from('ip_blacklist')
        .select('reason, expires_at')
        .eq('ip_address', ipAddress)
        .or('expires_at.is.null,expires_at.gt.now()')
        .single()

      if (blacklistEntry) {
        return {
          blocked: true,
          reason: blacklistEntry.reason
        }
      }

      return { blocked: false }
    } catch (error) {
      logger.error('Error checking IP blacklist:', error)
      return { blocked: false }
    }
  }

  /**
   * Obtém o IP real do request considerando proxies
   */
  extractRealIp(req: any): string {
    // Ordem de precedência para obter o IP real
    const ipSources = [
      req.headers['cf-connecting-ip'], // Cloudflare
      req.headers['x-real-ip'], // Nginx proxy
      req.headers['x-forwarded-for']?.split(',')[0], // Lista de proxies
      req.connection?.remoteAddress,
      req.socket?.remoteAddress,
      req.ip
    ]

    logger.debug('IP extraction debug:', {
      headers: {
        'cf-connecting-ip': req.headers['cf-connecting-ip'],
        'x-real-ip': req.headers['x-real-ip'],
        'x-forwarded-for': req.headers['x-forwarded-for']
      },
      connection: req.connection?.remoteAddress,
      socket: req.socket?.remoteAddress,
      expressIp: req.ip
    })

    for (const ip of ipSources) {
      if (ip && ip !== 'unknown') {
        // Limpar o IP (remover ::ffff: prefix do IPv6 mapped IPv4)
        const cleanIp = ip.replace(/^::ffff:/, '')
        
        // Validar se é um IP válido
        if (IpTrackingService.isValidIp(cleanIp)) {
          return cleanIp
        }
      }
    }

    return 'unknown'
  }

  /**
   * Valida se uma string é um IP válido
   */
  private static isValidIp(ip: string): boolean {
    // Regex simplificada para IPv4
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/
    // Regex simplificada para IPv6
    const ipv6Regex = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/

    return ipv4Regex.test(ip) || ipv6Regex.test(ip)
  }

  /**
   * Registra uma ação no log administrativo
   */
  private async logAction(data: {
    action: string
    userId?: string
    ipAddress?: string
    details?: any
  }): Promise<void> {
    try {
      await supabaseAdmin
        .from('admin_logs')
        .insert({
          action: data.action,
          ip_address: data.ipAddress === 'unknown' ? null : data.ipAddress,
          details: data.details
        })
    } catch (error) {
      logger.error('Error logging action:', error)
    }
  }

  /**
   * Obtém histórico de IPs de um usuário
   */
  async getUserIpHistory(userId: string) {
    try {
      const { data, error } = await supabaseAdmin
        .from('user_ip_tracking')
        .select('*')
        .eq('user_id', userId)
        .order('last_seen', { ascending: false })

      if (error) throw error

      return data
    } catch (error) {
      logger.error('Error fetching user IP history:', error)
      throw new ApiError('Erro ao buscar histórico de IPs', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  }
}

export default new IpTrackingService()