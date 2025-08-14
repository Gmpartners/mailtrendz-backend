import jwt from 'jsonwebtoken'
import { supabaseAdmin } from '../config/supabase.config'
import { logger } from '../utils/logger'

// ✅ NOVO: Cache simples para tokens verificados (reduzir consultas ao banco)
interface TokenCacheEntry {
  payload: any
  expiresAt: number
}

class TokenCache {
  private cache = new Map<string, TokenCacheEntry>()
  private readonly CACHE_DURATION = 5 * 60 * 1000 // 5 minutos

  get(token: string): any | null {
    const entry = this.cache.get(token)
    if (!entry || Date.now() > entry.expiresAt) {
      this.cache.delete(token)
      return null
    }
    return entry.payload
  }

  set(token: string, payload: any): void {
    // Limpar cache se ficar muito grande
    if (this.cache.size > 1000) {
      this.cache.clear()
    }
    
    this.cache.set(token, {
      payload,
      expiresAt: Date.now() + this.CACHE_DURATION
    })
  }

  delete(token: string): void {
    this.cache.delete(token)
  }

  clear(): void {
    this.cache.clear()
  }
}

const tokenCache = new TokenCache()

interface TokenPayload {
  userId: string
  email: string
  subscription?: string
  iat?: number
  exp?: number
}

interface TokenPair {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

class AuthTokenService {
  private readonly ACCESS_TOKEN_SECRET = process.env.JWT_SECRET || 'your-secret-key'
  private readonly REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key'
  private readonly ACCESS_TOKEN_EXPIRES_IN = '15m'
  private readonly REFRESH_TOKEN_EXPIRES_IN = '7d'

  /**
   * Criar par de tokens padronizado (access + refresh)
   */
  async createTokenPair(userId: string, email: string, subscription?: string): Promise<TokenPair> {
    try {
      const now = Date.now()
      const randomValue = Math.random().toString(36).substring(2, 15)
      
      const payload: TokenPayload = {
        userId,
        email,
        subscription: subscription || 'free'
      }

      // Gerar access token (curta duração)
      const accessToken = jwt.sign(payload, this.ACCESS_TOKEN_SECRET, {
        expiresIn: this.ACCESS_TOKEN_EXPIRES_IN,
        issuer: 'mailtrendz-backend',
        subject: userId,
        jwtid: `access_${now}_${randomValue}` // Unique ID para access token
      })

      // Gerar refresh token (longa duração) com uniqueness garantida
      const refreshToken = jwt.sign({
        ...payload,
        tokenType: 'refresh',
        nonce: randomValue, // Valor aleatório para garantir uniqueness
        timestamp: now // Timestamp preciso para garantir uniqueness
      }, this.REFRESH_TOKEN_SECRET, {
        expiresIn: this.REFRESH_TOKEN_EXPIRES_IN,
        issuer: 'mailtrendz-backend',
        subject: userId,
        jwtid: `refresh_${now}_${randomValue}` // Unique ID para refresh token
      })

      // Armazenar refresh token no banco (com rotação)
      await this.storeRefreshToken(userId, refreshToken)

      // Calcular tempo de expiração em segundos
      const decoded = jwt.decode(accessToken) as any
      const expiresIn = decoded.exp - Math.floor(Date.now() / 1000)

      logger.info('✅ [AUTH-TOKEN] Token pair created successfully', {
        userId,
        expiresIn,
        tokenLength: accessToken.length
      })

      return {
        accessToken,
        refreshToken,
        expiresIn
      }
    } catch (error) {
      logger.error('❌ [AUTH-TOKEN] Error creating token pair:', error)
      throw new Error('Failed to create authentication tokens')
    }
  }

  /**
   * Verificar access token
   */
  async verifyAccessToken(token: string): Promise<TokenPayload | null> {
    try {
      // ✅ OTIMIZAÇÃO: Verificar cache primeiro
      const cachedPayload = tokenCache.get(token)
      if (cachedPayload) {
        return cachedPayload
      }

      const decoded = jwt.verify(token, this.ACCESS_TOKEN_SECRET) as TokenPayload
      
      // Verificar se usuário ainda existe e está ativo
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id, email, subscription')
        .eq('id', decoded.userId)
        .single()

      if (!profile) {
        logger.warn('⚠️ [AUTH-TOKEN] Token valid but user not found:', { userId: decoded.userId })
        return null
      }

      const payload = {
        userId: decoded.userId,
        email: decoded.email,
        subscription: profile.subscription || 'free'
      }

      // ✅ OTIMIZAÇÃO: Cachear resultado para próximas verificações
      tokenCache.set(token, payload)

      return payload
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        if (process.env.NODE_ENV === 'development') {
          logger.debug('🔒 [AUTH-TOKEN] Invalid access token:', error.message)
        }
        return null
      }
      logger.error('❌ [AUTH-TOKEN] Error verifying access token:', error)
      return null
    }
  }

  /**
   * Verificar e renovar refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<TokenPair | null> {
    try {
      // Verificar refresh token
      const decoded = jwt.verify(refreshToken, this.REFRESH_TOKEN_SECRET) as TokenPayload

      // Verificar se refresh token existe no banco e não foi rotacionado
      const { data: storedToken } = await (supabaseAdmin as any)
        .from('user_refresh_tokens')
        .select('token, is_revoked')
        .eq('user_id', decoded.userId)
        .eq('token', refreshToken)
        .single()

      if (!storedToken || storedToken.is_revoked) {
        logger.warn('⚠️ [AUTH-TOKEN] Refresh token not found or revoked:', { userId: decoded.userId })
        return null
      }

      // Buscar dados atuais do usuário
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id, email, subscription')
        .eq('id', decoded.userId)
        .single()

      if (!profile) {
        logger.warn('⚠️ [AUTH-TOKEN] User not found during refresh:', { userId: decoded.userId })
        return null
      }

      // Revogar refresh token atual (rotação)
      await this.revokeRefreshToken(decoded.userId, refreshToken)

      // Criar novo par de tokens
      const newTokenPair = await this.createTokenPair(
        profile.id, 
        profile.email || '', // Fallback para string vazia se null
        profile.subscription || 'free' // Fallback para 'free' se null
      )

      logger.info('🔄 [AUTH-TOKEN] Token refreshed successfully', {
        userId: decoded.userId,
        email: profile.email
      })

      return newTokenPair
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        if (process.env.NODE_ENV === 'development') {
          logger.debug('🔒 [AUTH-TOKEN] Invalid refresh token:', error.message)
        }
        return null
      }
      logger.error('❌ [AUTH-TOKEN] Error refreshing token:', error)
      return null
    }
  }

  /**
   * Armazenar refresh token no banco com rotação
   */
  private async storeRefreshToken(userId: string, refreshToken: string): Promise<void> {
    try {
      // Calcular expiração
      const decoded = jwt.decode(refreshToken) as any
      const expiresAt = new Date(decoded.exp * 1000)

      // Primeira tentativa: Limpar tokens expirados para evitar acúmulo
      await this.cleanupExpiredRefreshTokens(userId)

      // Inserir novo refresh token com retry em caso de duplicata
      let insertError: any = null
      let retryCount = 0
      const maxRetries = 3

      while (retryCount < maxRetries) {
        const { error } = await (supabaseAdmin as any)
          .from('user_refresh_tokens')
          .insert({
            user_id: userId,
            token: refreshToken,
            expires_at: expiresAt.toISOString(),
            created_at: new Date().toISOString(),
            is_revoked: false
          })

        if (!error) {
          // Sucesso - sair do loop
          insertError = null
          break
        }

        insertError = error

        // Se for erro de constraint duplicada, tentar novamente com novo token
        if (error.code === '23505' && error.constraint === 'user_refresh_tokens_token_key') {
          logger.warn('⚠️ [AUTH-TOKEN] Duplicate token detected, regenerating...', {
            userId,
            attempt: retryCount + 1
          })
          
          // Regenerar token com novo timestamp e randomness
          const now = Date.now()
          const randomValue = Math.random().toString(36).substring(2, 15)
          
          const payload = {
            userId,
            email: decoded.email,
            subscription: decoded.subscription || 'free',
            tokenType: 'refresh',
            nonce: randomValue,
            timestamp: now
          }
          
          refreshToken = jwt.sign(payload, this.REFRESH_TOKEN_SECRET, {
            expiresIn: this.REFRESH_TOKEN_EXPIRES_IN,
            issuer: 'mailtrendz-backend',
            subject: userId,
            jwtid: `refresh_${now}_${randomValue}_retry${retryCount}`
          })
          
          retryCount++
        } else {
          // Outro tipo de erro - não fazer retry
          break
        }
      }

      if (insertError) {
        logger.error('❌ [AUTH-TOKEN] Failed to store refresh token after retries:', insertError)
        throw insertError
      }

      // Limpar refresh tokens antigos (manter apenas os 5 mais recentes)
      await this.cleanupOldRefreshTokens(userId)
    } catch (error) {
      logger.error('❌ [AUTH-TOKEN] Error in storeRefreshToken:', error)
      throw error
    }
  }

  /**
   * Revogar refresh token específico
   */
  private async revokeRefreshToken(userId: string, refreshToken: string): Promise<void> {
    try {
      const { error } = await (supabaseAdmin as any)
        .from('user_refresh_tokens')
        .update({ 
          is_revoked: true, 
          revoked_at: new Date().toISOString() 
        } as any)
        .eq('user_id', userId)
        .eq('token', refreshToken)

      if (error) {
        logger.error('❌ [AUTH-TOKEN] Error revoking refresh token:', error)
      }
    } catch (error) {
      logger.error('❌ [AUTH-TOKEN] Error in revokeRefreshToken:', error)
    }
  }

  /**
   * Limpar refresh tokens expirados
   */
  private async cleanupExpiredRefreshTokens(userId: string): Promise<void> {
    try {
      const now = new Date().toISOString()
      
      const { error, count } = await (supabaseAdmin as any)
        .from('user_refresh_tokens')
        .delete()
        .eq('user_id', userId)
        .or(`expires_at.lt.${now},is_revoked.eq.true`)

      if (!error && count && count > 0) {
        logger.debug('🧹 [AUTH-TOKEN] Cleaned up expired/revoked tokens', {
          userId,
          deletedCount: count
        })
      }
    } catch (error) {
      logger.warn('⚠️ [AUTH-TOKEN] Error cleaning up expired tokens:', error)
      // Não quebrar o fluxo se limpeza falhar
    }
  }

  /**
   * Limpar refresh tokens antigos
   */
  private async cleanupOldRefreshTokens(userId: string): Promise<void> {
    try {
      // Manter apenas os 5 refresh tokens mais recentes (aumentado de 3 para 5)
      const { data: tokens } = await (supabaseAdmin as any)
        .from('user_refresh_tokens')
        .select('id')
        .eq('user_id', userId)
        .eq('is_revoked', false) // Apenas tokens não revogados
        .order('created_at', { ascending: false })
        .range(5, 100) // Pegar do 6º em diante

      if (tokens && tokens.length > 0) {
        const tokenIds = tokens.map((t: any) => t.id)
        await (supabaseAdmin as any)
          .from('user_refresh_tokens')
          .delete()
          .in('id', tokenIds)

        if (process.env.NODE_ENV === 'development') {
          logger.debug('🧹 [AUTH-TOKEN] Cleaned up old refresh tokens', {
            userId,
            deletedCount: tokenIds.length
          })
        }
      }
    } catch (error) {
      logger.warn('⚠️ [AUTH-TOKEN] Error cleaning up old tokens:', error)
      // Não quebrar o fluxo se limpeza falhar
    }
  }

  /**
   * Revogar todos os refresh tokens de um usuário (logout completo)
   */
  async revokeAllUserTokens(userId: string): Promise<void> {
    try {
      const { error } = await (supabaseAdmin as any)
        .from('user_refresh_tokens')
        .update({ 
          is_revoked: true, 
          revoked_at: new Date().toISOString() 
        } as any)
        .eq('user_id', userId)

      if (error) {
        logger.error('❌ [AUTH-TOKEN] Error revoking all user tokens:', error)
        throw error
      }

      // ✅ OTIMIZAÇÃO: Limpar cache de tokens após revogar
      tokenCache.clear()

      logger.info('🚪 [AUTH-TOKEN] All user tokens revoked', { userId })
    } catch (error) {
      logger.error('❌ [AUTH-TOKEN] Error in revokeAllUserTokens:', error)
      throw error
    }
  }

  /**
   * Validar token Supabase para login social
   */
  async validateSupabaseToken(supabaseAccessToken: string): Promise<TokenPayload | null> {
    try {
      // Usar token Supabase para buscar usuário
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(supabaseAccessToken)
      
      if (error || !user) {
        logger.warn('⚠️ [AUTH-TOKEN] Invalid Supabase token')
        return null
      }

      // Buscar perfil no banco
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id, email, subscription')
        .eq('id', user.id)
        .single()

      if (!profile) {
        logger.warn('⚠️ [AUTH-TOKEN] Profile not found for Supabase user:', { userId: user.id })
        return null
      }

      return {
        userId: profile.id,
        email: profile.email || '',
        subscription: profile.subscription || 'free'
      }
    } catch (error) {
      logger.error('❌ [AUTH-TOKEN] Error validating Supabase token:', error)
      return null
    }
  }
}

export default new AuthTokenService()