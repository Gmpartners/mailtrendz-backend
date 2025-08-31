import jwt from 'jsonwebtoken'
import { supabaseAdmin } from '../config/supabase.config'
import { logger } from '../utils/logger'

// ✅ NOVO: Cache simples para tokens verificados (reduzir consultas ao banco)
interface TokenCacheEntry {
  payload: any
  expiresAt: number
}

// ✅ OTIMIZADO: Cache mais inteligente e performático
class TokenCache {
  private cache = new Map<string, TokenCacheEntry>()
  private userProfileCache = new Map<string, { data: any; expiresAt: number }>()
  private usageInfoCache = new Map<string, { data: any; expiresAt: number }>()
  
  // ✅ OTIMIZAÇÃO: Cache duration otimizado para localhost
  private readonly TOKEN_CACHE_DURATION = 30 * 60 * 1000 // 30 minutos (aumentado)
  private readonly PROFILE_CACHE_DURATION = 60 * 60 * 1000 // 1 hora (aumentado)  
  private readonly USAGE_CACHE_DURATION = 30 * 60 * 1000 // 30 minutos (aumentado)
  private readonly MAX_CACHE_SIZE = 5000 // Aumentado para desenvolvimento

  get(token: string): any | null {
    const entry = this.cache.get(token)
    if (!entry || Date.now() > entry.expiresAt) {
      this.cache.delete(token)
      return null
    }
    return entry.payload
  }

  set(token: string, payload: any): void {
    // ✅ OTIMIZAÇÃO: Cleanup mais inteligente - remover apenas expirados primeiro
    if (this.cache.size > this.MAX_CACHE_SIZE) {
      this.cleanupExpired()
      
      // Se ainda estiver muito grande, limpar mais antigos
      if (this.cache.size > this.MAX_CACHE_SIZE * 0.8) {
        const entries = Array.from(this.cache.entries())
        entries.sort((a, b) => a[1].expiresAt - b[1].expiresAt)
        const toDelete = entries.slice(0, Math.floor(entries.length * 0.3))
        toDelete.forEach(([key]) => this.cache.delete(key))
      }
    }
    
    this.cache.set(token, {
      payload,
      expiresAt: Date.now() + this.TOKEN_CACHE_DURATION
    })
  }

  // ✅ NOVO: Cache específico para profile de usuário
  getUserProfile(userId: string): any | null {
    const entry = this.userProfileCache.get(userId)
    if (!entry || Date.now() > entry.expiresAt) {
      this.userProfileCache.delete(userId)
      return null
    }
    return entry.data
  }

  setUserProfile(userId: string, data: any): void {
    this.userProfileCache.set(userId, {
      data,
      expiresAt: Date.now() + this.PROFILE_CACHE_DURATION
    })
  }

  // ✅ NOVO: Cache específico para usage info
  getUsageInfo(userId: string): any | null {
    const entry = this.usageInfoCache.get(userId)
    if (!entry || Date.now() > entry.expiresAt) {
      this.usageInfoCache.delete(userId)
      return null
    }
    return entry.data
  }

  setUsageInfo(userId: string, data: any): void {
    this.usageInfoCache.set(userId, {
      data,
      expiresAt: Date.now() + this.USAGE_CACHE_DURATION
    })
  }

  // ✅ NOVO: Invalidar cache específico do usuário
  invalidateUser(userId: string): void {
    this.userProfileCache.delete(userId)
    this.usageInfoCache.delete(userId)
    
    // Remover tokens deste usuário também
    for (const [token, entry] of this.cache.entries()) {
      if (entry.payload.userId === userId) {
        this.cache.delete(token)
      }
    }
  }

  private cleanupExpired(): void {
    const now = Date.now()
    
    // Limpar tokens expirados
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key)
      }
    }
    
    // Limpar profiles expirados
    for (const [key, entry] of this.userProfileCache.entries()) {
      if (now > entry.expiresAt) {
        this.userProfileCache.delete(key)
      }
    }
    
    // Limpar usage info expirado
    for (const [key, entry] of this.usageInfoCache.entries()) {
      if (now > entry.expiresAt) {
        this.usageInfoCache.delete(key)
      }
    }
  }

  delete(token: string): void {
    this.cache.delete(token)
  }

  clear(): void {
    this.cache.clear()
    this.userProfileCache.clear()
    this.usageInfoCache.clear()
  }

  // ✅ NOVO: Estatísticas do cache para monitoring
  getStats(): { tokenCache: number; profileCache: number; usageCache: number } {
    return {
      tokenCache: this.cache.size,
      profileCache: this.userProfileCache.size,
      usageCache: this.usageInfoCache.size
    }
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
  private readonly ACCESS_TOKEN_EXPIRES_IN = '2h'
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
   * ✅ OTIMIZADO: Verificar access token com cache inteligente
   */
  async verifyAccessToken(token: string): Promise<TokenPayload | null> {
    try {
      // ✅ STEP 1: Verificar cache de token primeiro (evita JWT decode + DB query)
      const cachedPayload = tokenCache.get(token)
      if (cachedPayload) {
        return cachedPayload
      }

      // ✅ STEP 2: Decodificar JWT (falha rápida para tokens inválidos)
      const decoded = jwt.verify(token, this.ACCESS_TOKEN_SECRET) as TokenPayload
      
      // ✅ STEP 3: Verificar cache de profile antes de consultar DB
      let profile = tokenCache.getUserProfile(decoded.userId)
      
      if (!profile) {
        // ✅ STEP 4: Buscar perfil no DB apenas se não está em cache
        const { data: dbProfile } = await supabaseAdmin
          .from('profiles')
          .select('id, email, subscription')
          .eq('id', decoded.userId)
          .single()

        if (!dbProfile) {
          logger.warn('⚠️ [AUTH-TOKEN] Token valid but user not found:', { userId: decoded.userId })
          return null
        }
        
        profile = dbProfile
        // ✅ CACHE: Armazenar perfil para próximas verificações
        tokenCache.setUserProfile(decoded.userId, profile)
      }

      const payload = {
        userId: decoded.userId,
        email: decoded.email,
        subscription: profile.subscription || 'free'
      }

      // ✅ CACHE: Armazenar token verificado para próximas verificações
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
   * ✅ OTIMIZADO: Armazenar refresh token - operações desnecessárias removidas
   */
  private async storeRefreshToken(userId: string, refreshToken: string): Promise<void> {
    try {
      // ✅ OTIMIZAÇÃO: Calcular expiração apenas uma vez
      const decoded = jwt.decode(refreshToken) as any
      const expiresAt = new Date(decoded.exp * 1000)

      // ✅ OTIMIZAÇÃO: Inserção direta sem cleanup prévia (será feita async depois)
      const { error } = await (supabaseAdmin as any)
        .from('user_refresh_tokens')
        .insert({
          user_id: userId,
          token: refreshToken,
          expires_at: expiresAt.toISOString(),
          created_at: new Date().toISOString(),
          is_revoked: false
        })

      if (error) {
        // ✅ SIMPLIFICADO: Se falhar, apenas logar e tentar uma vez
        if (error.code === '23505' && error.constraint === 'user_refresh_tokens_token_key') {
          logger.warn('⚠️ [AUTH-TOKEN] Duplicate token - cleaning up and retrying once', { userId })
          
          // Limpar tokens expirados e tentar uma vez
          await this.cleanupExpiredRefreshTokens(userId)
          
          const retryResult = await (supabaseAdmin as any)
            .from('user_refresh_tokens')
            .insert({
              user_id: userId,
              token: refreshToken,
              expires_at: expiresAt.toISOString(),
              created_at: new Date().toISOString(),
              is_revoked: false
            })
          
          if (retryResult.error) {
            logger.error('❌ [AUTH-TOKEN] Failed to store refresh token after cleanup:', retryResult.error)
            throw retryResult.error
          }
        } else {
          logger.error('❌ [AUTH-TOKEN] Failed to store refresh token:', error)
          throw error
        }
      }

      // ✅ OTIMIZAÇÃO: Cleanup assíncrono (não bloquear resposta)
      this.asyncCleanupOldTokens(userId).catch(cleanupError => {
        logger.warn('⚠️ [AUTH-TOKEN] Async cleanup warning (não crítico):', cleanupError.message)
      })
      
    } catch (error) {
      logger.error('❌ [AUTH-TOKEN] Error in storeRefreshToken:', error)
      throw error
    }
  }

  /**
   * ✅ NOVO: Cleanup assíncrono para não bloquear resposta
   */
  private async asyncCleanupOldTokens(userId: string): Promise<void> {
    try {
      // Executar limpezas em paralelo
      await Promise.all([
        this.cleanupExpiredRefreshTokens(userId),
        this.cleanupOldRefreshTokens(userId)
      ])
    } catch (error) {
      // Falha silenciosa - não é crítica para o fluxo principal
      logger.debug('Debug: Async cleanup error (non-critical):', error)
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

  // ✅ MÉTODOS PÚBLICOS DE CACHE para uso no controller
  getCachedProfile(userId: string): any | null {
    return tokenCache.getUserProfile(userId)
  }

  setCachedProfile(userId: string, profile: any): void {
    tokenCache.setUserProfile(userId, profile)
  }

  getCachedUsage(userId: string): any | null {
    return tokenCache.getUsageInfo(userId)
  }

  setCachedUsage(userId: string, usage: any): void {
    tokenCache.setUsageInfo(userId, usage)
  }

  invalidateUserCache(userId: string): void {
    tokenCache.invalidateUser(userId)
  }

  getCacheStats(): { tokenCache: number; profileCache: number; usageCache: number } {
    return tokenCache.getStats()
  }
}

export default new AuthTokenService()