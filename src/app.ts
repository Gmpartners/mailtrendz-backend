import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'
import dotenv from 'dotenv'

dotenv.config()

import { testConnection } from './config/supabase.config'
import corsOptions from './config/cors.config'
import { logger, morganStream } from './utils/logger'
import { API_PREFIX } from './utils/constants'

import { 
  errorHandler, 
  notFoundHandler, 
  performanceLogger 
} from './middleware/error.middleware'
import { generalLimiter } from './middleware/rate-limit.middleware'

import authRoutes from './routes/auth.routes'
import projectRoutes from './routes/project.routes'
import projectDebugRoutes from './routes/project.routes.debug'
import chatRoutes from './routes/chat.routes'
import userRoutes from './routes/user.routes'
import aiRoutes from './routes/ai.routes'
import uploadRoutes from './routes/upload.routes'
import subscriptionRoutes from './routes/subscription.routes'
import folderRoutes from './routes/folder.routes'
import creditsRoutes from './routes/credits.routes'

class App {
  public app: express.Application
  public port: number

  constructor() {
    this.app = express()
    this.port = parseInt(process.env.PORT || '3000')
    
    this.initializeMiddlewares()
    this.initializeRoutes()
    this.initializeErrorHandling()
  }

  private initializeMiddlewares(): void {
    if (process.env.NODE_ENV === 'production') {
      this.app.set('trust proxy', 1)
    } else {
      this.app.set('trust proxy', false)
    }
    
    this.app.use(morgan('combined', { stream: morganStream }))
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
    
    this.app.use((req, res, next) => {
      if (req.originalUrl === `${API_PREFIX}/subscriptions/webhook`) {
        next()
      } else {
        express.json({ limit: '10mb' })(req, res, next)
      }
    })
    
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }))
    this.app.use(cookieParser())
    
    this.app.use((req, res, next) => {
      if (req.originalUrl !== `${API_PREFIX}/subscriptions/webhook`) {
        generalLimiter(req, res, next)
      } else {
        next()
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
        message: 'MailTrendz API v2.0 - Backend Funcionando!',
        version: '2.0.0-supabase-stripe',
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
          credits: 'active'
        }
      })
    })

    this.app.get('/health', async (_req, res) => {
      try {
        const dbConnected = await testConnection()
        const memoryUsage = process.memoryUsage()
        
        const health = {
          status: dbConnected ? 'ok' : 'degraded',
          timestamp: new Date(),
          uptime: process.uptime(),
          version: '2.0.0-supabase-stripe',
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
            credits: { status: 'active' }
          },
          memory: {
            used: Math.round(memoryUsage.heapUsed / 1024 / 1024 * 100) / 100,
            total: Math.round(memoryUsage.heapTotal / 1024 / 1024 * 100) / 100,
            percentage: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100)
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

    this.app.use(`${API_PREFIX}/auth`, authRoutes)
    this.app.use(`${API_PREFIX}/projects`, projectRoutes)
    this.app.use(`${API_PREFIX}/projects-debug`, projectDebugRoutes) // ✅ ROTA DE DEBUG
    this.app.use(`${API_PREFIX}/chats`, chatRoutes)
    this.app.use(`${API_PREFIX}/ai`, aiRoutes)
    this.app.use(`${API_PREFIX}/users`, userRoutes)
    this.app.use(`${API_PREFIX}/upload`, uploadRoutes)
    this.app.use(`${API_PREFIX}/subscriptions`, subscriptionRoutes)
    this.app.use(`${API_PREFIX}/folders`, folderRoutes)
    this.app.use(`${API_PREFIX}/credits`, creditsRoutes)

    this.app.get(`${API_PREFIX}`, (_req, res) => {
      res.json({
        success: true,
        message: 'MailTrendz Supabase API v2.0',
        version: '2.0.0-supabase-stripe',
        endpoints: {
          auth: `${API_PREFIX}/auth`,
          projects: `${API_PREFIX}/projects`,
          chats: `${API_PREFIX}/chats`,
          ai: `${API_PREFIX}/ai`,
          users: `${API_PREFIX}/users`,
          upload: `${API_PREFIX}/upload`,
          subscriptions: `${API_PREFIX}/subscriptions`,
          folders: `${API_PREFIX}/folders`,
          credits: `${API_PREFIX}/credits`,
          health: `${API_PREFIX}/health`
        },
        features: {
          login: `${API_PREFIX}/auth/login`,
          register: `${API_PREFIX}/auth/register`,
          aiGenerate: `${API_PREFIX}/ai/generate`,
          uploadImage: `${API_PREFIX}/upload/image`,
          plans: `${API_PREFIX}/subscriptions/plans`,
          checkout: `${API_PREFIX}/subscriptions/checkout`,
          creditsInfo: `${API_PREFIX}/credits/info`
        },
        timestamp: new Date()
      })
    })

    this.app.get(`${API_PREFIX}/health`, async (_req, res) => {
      try {
        const dbConnected = await testConnection()
        
        const health = {
          status: dbConnected ? 'ok' : 'degraded',
          service: 'MailTrendz Supabase API',
          timestamp: new Date(),
          uptime: process.uptime(),
          version: '2.0.0-supabase-stripe',
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
      
      console.log('🧠 [APP] Sistema MailTrendz Supabase com Stripe iniciando...')
      
      this.app.listen(this.port, '0.0.0.0', () => {
        logger.info(`🚀 MailTrendz API rodando na porta ${this.port}`, {
          port: this.port,
          environment: process.env.NODE_ENV || 'development',
          version: '2.0.0-supabase-stripe',
          database: dbConnected ? 'connected' : 'disconnected',
          stripe: process.env.STRIPE_SECRET_KEY ? 'configured' : 'not-configured'
        })
        
        console.log('✨ [APP] Servidor rodando:')
        console.log(`   📧 API Base: ${API_PREFIX}`)
        console.log(`   🔐 Auth: ${API_PREFIX}/auth/login`)
        console.log(`   🤖 AI: ${API_PREFIX}/ai/generate`)
        console.log(`   📁 Upload: ${API_PREFIX}/upload/image`)
        console.log(`   💳 Subscriptions: ${API_PREFIX}/subscriptions/plans`)
        console.log(`   📂 Folders: ${API_PREFIX}/folders`)
        console.log(`   🎯 Credits: ${API_PREFIX}/credits/info`)
        console.log(`   ⚡ Health: /health`)
        console.log(`   🔧 Debug: ${API_PREFIX}/projects-debug/test-create`)
        console.log(`   🗄️  Database: Supabase ${dbConnected ? '✅' : '❌'}`)
        console.log(`   💰 Stripe: ${process.env.STRIPE_SECRET_KEY ? '✅' : '❌'}`)
        console.log(`   🎟️  Credits: Free Plan (3 usos) ✅`)
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
    logger.info('Server shutdown complete')
    process.exit(0)
  }
}

export default App