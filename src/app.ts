import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'
import dotenv from 'dotenv'
import path from 'path'

// ✅ CONFIGURAÇÃO DE AMBIENTE DINÂMICA
const nodeEnv = process.env.NODE_ENV || 'development'
const envPath = nodeEnv === 'production' ? '.env' : `.env.${nodeEnv}`

dotenv.config({ path: path.resolve(process.cwd(), envPath) })

console.log(`🔧 [CONFIG] Loaded environment: ${nodeEnv} from ${envPath}`)
import { testConnection } from './config/supabase.config'
import corsOptions from './config/cors.config'
import { logger, morganStream } from './utils/logger'
import { API_PREFIX } from './utils/constants'
import cacheService from './cache/memory-cache.service'

import { 
  errorHandler, 
  notFoundHandler, 
  performanceLogger 
} from './middleware/error.middleware'
import { 
  generalLimiter, 
  authLimiter, 
  aiGenerationLimiter, 
  uploadLimiter 
} from './middleware/rate-limit.middleware'

import authRoutes from './routes/auth.routes'
import projectRoutes from './routes/project.routes'
import chatRoutes from './routes/chat.routes'
import userRoutes from './routes/user.routes'
import aiRoutes from './routes/ai.routes'
import uploadRoutes from './routes/upload.routes'
import subscriptionRoutes from './routes/subscription.routes'
import creditsRoutes from './routes/credits.routes'
import webhookRoutes from './routes/webhook.routes'
import translationRoutes from './routes/translation.routes'
import trackingRoutes from './routes/tracking.routes'

class App {
  public app: express.Application
  public port: number

  constructor() {
    this.app = express()
    this.port = parseInt(process.env.PORT || '8001') // TEMPORÁRIO: mudando para 8001 para evitar conflito
    
    this.initializeMiddlewares()
    this.initializeRoutes()
    this.initializeErrorHandling()
  }

  private initializeMiddlewares(): void {
    // ✅ TRUST PROXY ESPECÍFICO - apenas proxies confiáveis
    this.app.set('trust proxy', process.env.NODE_ENV === 'production' ? 1 : false)
    
    // ✅ LOGS OTIMIZADOS - apenas 'short' em desenvolvimento para reduzir ruído
    const morganFormat = process.env.NODE_ENV === 'development' ? 'short' : 'combined'
    this.app.use(morgan(morganFormat, { 
      stream: morganStream,
      // Skip de logs para endpoints de debug/health em produção
      skip: (req) => {
        if (process.env.NODE_ENV === 'production') {
          return req.url.includes('/debug/') || req.url === '/health'
        }
        return false
      }
    }))
    
    this.app.use(performanceLogger)
    
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false
    }))
    
    this.app.use(cors(corsOptions))
    this.app.use(compression())
    
    // ✅ WEBHOOK ROUTES PRIMEIRO - CRÍTICO PARA STRIPE
    // Webhooks precisam do body raw (Buffer) para validação de assinatura
    this.app.use(`${API_PREFIX}/webhooks/stripe`, express.raw({ type: 'application/json' }))
    this.app.use(`${API_PREFIX}/subscriptions/webhook`, express.raw({ type: 'application/json' }))
    
    // ✅ TIMEOUT CONFIGURATION
    this.app.use((req, res, next) => {
      // Timeout maior para operações de IA
      if (req.path.includes('/ai/') || req.path.includes('/chat/')) {
        req.setTimeout(300000) // 5 minutos para IA
        res.setTimeout(300000)
      } else {
        req.setTimeout(120000) // 2 minutos para outras operações
        res.setTimeout(120000)
      }
      next()
    })
    
    // ✅ JSON parsing para todas as outras rotas
    this.app.use(express.json({ limit: '10mb' }))
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }))
    this.app.use(cookieParser())
    
    // ✅ RATE LIMITING OTIMIZADO - exceto para webhooks
    this.app.use((req, res, next) => {
      const isWebhook = req.originalUrl.includes('/webhook') || 
                       req.originalUrl === `${API_PREFIX}/subscriptions/webhook`
      
      if (isWebhook) {
        next() // Pular rate limiting para webhooks
      } else {
        generalLimiter(req, res, next)
      }
    })
    
    this.app.use((_req, res, next) => {
      res.setHeader('X-Content-Type-Options', 'nosniff')
      res.setHeader('X-Frame-Options', 'DENY')
      res.setHeader('X-XSS-Protection', '1; mode=block')
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
      next()
    })
    
    this.app.use((req, _res, next) => {
      req.headers['x-request-id'] = req.headers['x-request-id'] || 
        `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      next()
    })
  }

  private initializeRoutes(): void {
    this.app.get('/', (_req, res) => {
      res.json({
        success: true,
        message: 'MailTrendz API v4.2 - Simplified Single-User!',
        version: '4.2.0-single-user',
        timestamp: new Date(),
        environment: process.env.NODE_ENV || 'development',
        port: this.port,
        features: {
          database: 'supabase',
          auth: 'supabase-auth',
          storage: 'supabase-storage',
          realtime: 'supabase-realtime',
          payments: 'stripe',
          subscriptions: 'active',
          credits: 'active',
          cache: 'memory-optimized',
          rateLimiting: 'optimized',
          singleUser: 'active'
        }
      })
    })

    this.app.get('/health', async (_req, res) => {
      try {
        const dbConnected = await testConnection()
        const memoryUsage = process.memoryUsage()
        const cacheStats = cacheService.getStats()
        
        const health = {
          status: dbConnected ? 'ok' : 'degraded',
          timestamp: new Date(),
          uptime: process.uptime(),
          version: '4.2.0-single-user',
          environment: process.env.NODE_ENV || 'development',
          port: this.port,
          services: {
            database: { 
              status: dbConnected ? 'connected' : 'disconnected',
              provider: 'supabase'
            },
            api: { status: 'ok' },
            payments: { 
              status: process.env.STRIPE_SECRET_KEY ? 'configured' : 'not-configured',
              provider: 'stripe'
            },
            credits: { status: 'active' },
            cache: {
              status: 'active',
              general: cacheStats.general.size,
              auth: cacheStats.auth.size,
              subscription: cacheStats.subscription.size
            },
            singleUser: { status: 'active' }
          },
          memory: {
            used: Math.round(memoryUsage.heapUsed / 1024 / 1024 * 100) / 100,
            total: Math.round(memoryUsage.heapTotal / 1024 / 1024 * 100) / 100,
            percentage: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100)
          },
          performance: {
            cacheHitRate: 'available',
            avgResponseTime: 'monitored'
          }
        }

        const statusCode = dbConnected ? 200 : 503
        res.status(statusCode).json({
          success: dbConnected,
          data: health
        })
      } catch (error) {
        res.status(500).json({
          success: false,
          message: 'Health check failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    })

    // ✅ ROTAS COM RATE LIMITING ESPECÍFICO
    this.app.use(`${API_PREFIX}/auth`, authLimiter, authRoutes)
    this.app.use(`${API_PREFIX}/projects`, projectRoutes)
    this.app.use(`${API_PREFIX}/chats`, chatRoutes)
    
    // ✅ ROTAS AI COM RATE LIMITING CONDICIONAL
    this.app.use(`${API_PREFIX}/ai`, (req, res, next) => {
      // Excluir endpoints de health e status do rate limiting
      const excludedPaths = ['/health', '/test-connection', '/metrics', '/status']
      const isExcluded = excludedPaths.some(path => req.path === path)
      
      if (isExcluded) {
        // Pular rate limiting para endpoints de monitoramento
        next()
      } else {
        // Aplicar rate limiting para endpoints de geração
        aiGenerationLimiter(req, res, next)
      }
    }, aiRoutes)
    
    this.app.use(`${API_PREFIX}/users`, userRoutes)
    this.app.use(`${API_PREFIX}/upload`, uploadLimiter, uploadRoutes)
    this.app.use(`${API_PREFIX}/subscriptions`, subscriptionRoutes) // Rate limiting já está nas rotas
    this.app.use(`${API_PREFIX}/credits`, creditsRoutes)
    this.app.use(`${API_PREFIX}/translation`, translationRoutes)
    this.app.use(`${API_PREFIX}/tracking`, trackingRoutes) // Rotas de tracking Facebook Conversions API
    this.app.use(`${API_PREFIX}/webhooks`, webhookRoutes) // Rotas de webhook com middleware próprio
    

    this.app.get(`${API_PREFIX}`, (_req, res) => {
      res.json({
        success: true,
        message: 'MailTrendz Supabase API v4.2 - Single-User',
        version: '4.2.0-single-user',
        endpoints: {
          auth: `${API_PREFIX}/auth`,
          projects: `${API_PREFIX}/projects`,
          chats: `${API_PREFIX}/chats`,
          ai: `${API_PREFIX}/ai`,
          users: `${API_PREFIX}/users`,
          upload: `${API_PREFIX}/upload`,
          subscriptions: `${API_PREFIX}/subscriptions`,
          credits: `${API_PREFIX}/credits`,
          tracking: `${API_PREFIX}/tracking`,
          webhooks: `${API_PREFIX}/webhooks`,
          health: `${API_PREFIX}/health`
        },
        features: {
          login: `${API_PREFIX}/auth/login`,
          register: `${API_PREFIX}/auth/register`,
          aiGenerate: `${API_PREFIX}/ai/generate`,
          uploadImage: `${API_PREFIX}/upload/image`,
          plans: `${API_PREFIX}/subscriptions/plans`,
          checkout: `${API_PREFIX}/subscriptions/checkout`,
          creditsInfo: `${API_PREFIX}/credits/info`,
        },
        optimizations: {
          memoryCache: 'enabled',
          rateLimiting: 'endpoint-specific',
          authOptimization: 'enabled',
          subscriptionOptimization: 'enabled',
          spamProtection: 'enabled',
          singleUserMode: 'enabled'
        },
        timestamp: new Date()
      })
    })

    this.app.get(`${API_PREFIX}/health`, async (_req, res) => {
      try {
        const dbConnected = await testConnection()
        const cacheStats = cacheService.getStats()
        
        const health = {
          status: dbConnected ? 'ok' : 'degraded',
          service: 'MailTrendz Supabase API',
          timestamp: new Date(),
          uptime: process.uptime(),
          version: '4.2.0-single-user',
          environment: process.env.NODE_ENV || 'development',
          database: {
            status: dbConnected ? 'connected' : 'disconnected',
            provider: 'supabase'
          },
          payments: {
            status: process.env.STRIPE_SECRET_KEY ? 'configured' : 'not-configured',
            provider: 'stripe'
          },
          credits: {
            status: 'active',
            freePlanCredits: 3
          },
          cache: {
            status: 'active',
            totalItems: cacheStats.general.size + cacheStats.auth.size + cacheStats.subscription.size,
            memoryUsage: `${cacheStats.memory.used.toFixed(1)}MB`
          },
          singleUser: {
            status: 'active',
            features: ['simplified-ui', 'direct-access', 'personal-workspace']
          }
        }

        res.json({
          success: true,
          data: health
        })
      } catch (error) {
        res.status(500).json({
          success: false,
          message: 'API health check failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    })
  }

  private initializeErrorHandling(): void {
    this.app.use(notFoundHandler)
    this.app.use(errorHandler)
  }

  public async start(): Promise<void> {
    try {
      const dbConnected = await testConnection()
      
      if (!dbConnected) {
        logger.warn('Starting server without database connection')
      }
      
      console.log('🚀 [APP] Sistema MailTrendz Single-User v4.2 iniciando...')
      
      this.app.listen(this.port, '0.0.0.0', () => {
        logger.info(`🎯 MailTrendz API Single-User rodando na porta ${this.port}`, {
          port: this.port,
          environment: process.env.NODE_ENV || 'development',
          version: '4.2.0-single-user',
          database: dbConnected ? 'connected' : 'disconnected',
          stripe: process.env.STRIPE_SECRET_KEY ? 'configured' : 'not-configured',
          cache: 'memory-optimized',
          singleUser: 'active'
        })
        
        console.log('✨ [APP] Servidor Single-User rodando:')
        console.log(`   📧 API Base: ${API_PREFIX}`)
        console.log(`   🔐 Auth (Rate Limited): ${API_PREFIX}/auth/login`)
        console.log(`   🤖 AI (Rate Limited): ${API_PREFIX}/ai/generate`)
        console.log(`   📁 Upload (Rate Limited): ${API_PREFIX}/upload/image`)
        console.log(`   💳 Subscriptions (Optimized): ${API_PREFIX}/subscriptions/plans`)
        console.log(`   🎯 Credits (Cached): ${API_PREFIX}/credits/info`)
        console.log(`   📊 Debug Tools: ${API_PREFIX}/debug/cache/stats`)
        console.log(`   ⚡ Health (Enhanced): /health`)
        console.log(`   🗄️  Database: Supabase ${dbConnected ? '✅' : '❌'}`)
        console.log(`   💰 Stripe: ${process.env.STRIPE_SECRET_KEY ? '✅' : '❌'}`)
        console.log(`   🧠 Memory Cache: Ativo ✅`)
        console.log(`   ⚡ Rate Limiting: Otimizado ✅`)
        console.log(`   🛡️  Spam Protection: Ativo ✅`)
        console.log(`   🎟️  Credits: Free Plan (3 usos) ✅`)
        console.log(`   🏠 Single-User: Simplified & Streamlined ✅`)
        
        // ✅ ESTATÍSTICAS INICIAIS DO CACHE
        const cacheStats = cacheService.getStats()
        console.log(`   📊 Cache Stats: ${cacheStats.general.size} items, ${cacheStats.memory.used.toFixed(1)}MB`)
      })
      
      process.on('SIGTERM', this.gracefulShutdown.bind(this))
      process.on('SIGINT', this.gracefulShutdown.bind(this))
      
    } catch (error) {
      logger.error('Failed to start server:', error)
      process.exit(1)
    }
  }

  private async gracefulShutdown(signal: string): Promise<void> {
    logger.info(`Received ${signal}, shutting down gracefully...`)
    
    // ✅ LIMPAR CACHE AO DESLIGAR
    cacheService.clear()
    logger.info('Cache cleared during shutdown')
    
    logger.info('Server shutdown complete')
    process.exit(0)
  }
}

export default App
