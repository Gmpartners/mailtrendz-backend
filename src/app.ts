import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'
import dotenv from 'dotenv'

dotenv.config()

import Database from './config/database.config'
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
import chatRoutes from './routes/chat.routes'
import userRoutes from './routes/user.routes'
import aiRoutes from './routes/ai.routes'
import enhancedAIRoutes from './routes/enhanced-ai.routes'

class App {
  public app: express.Application
  public port: number

  constructor() {
    this.app = express()
    this.port = parseInt(process.env.PORT || '8000')
    
    this.initializeMiddlewares()
    this.initializeRoutes()
    this.initializeErrorHandling()
  }

  private initializeMiddlewares(): void {
    this.app.set('trust proxy', true)
    
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
    this.app.use(generalLimiter)
    
    this.app.use(express.json({ limit: '10mb' }))
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }))
    this.app.use(cookieParser())
    
    this.app.use((req, res, next) => {
      res.setHeader('X-Content-Type-Options', 'nosniff')
      res.setHeader('X-Frame-Options', 'DENY')
      res.setHeader('X-XSS-Protection', '1; mode=block')
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
      next()
    })
    
    this.app.use((req, res, next) => {
      req.headers['x-request-id'] = req.headers['x-request-id'] || 
        `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      next()
    })
  }

  private initializeRoutes(): void {
    this.app.get('/', (req, res) => {
      res.json({
        success: true,
        message: 'MailTrendz API v2.0 - Enhanced AI + Compatibility!',
        version: '2.0.0-enhanced',
        timestamp: new Date(),
        environment: process.env.NODE_ENV || 'development',
        features: {
          enhancedAI: true,
          smartAnalysis: true,
          intelligentChat: true,
          compatibilityAI: true
        }
      })
    })

    this.app.get('/health', async (req, res) => {
      try {
        const dbHealth = await Database.healthCheck()
        const memoryUsage = process.memoryUsage()
        
        let enhancedAIHealth = { status: 'unknown', available: false }
        try {
          const EnhancedAIService = (await import('./services/ai/enhanced/EnhancedAIService')).default
          const baseAIHealth = await EnhancedAIService.healthCheck()
          enhancedAIHealth = {
            status: baseAIHealth.status,
            available: baseAIHealth.status === 'available'
          }
        } catch (error) {
          enhancedAIHealth = { status: 'error', available: false }
        }
        
        const health = {
          status: 'ok',
          timestamp: new Date(),
          uptime: process.uptime(),
          version: '2.0.0-enhanced',
          environment: process.env.NODE_ENV || 'development',
          services: {
            database: dbHealth,
            api: { status: 'ok' },
            enhancedAI: enhancedAIHealth,
            compatibilityAI: { status: 'ok', available: true }
          },
          memory: {
            used: Math.round(memoryUsage.heapUsed / 1024 / 1024 * 100) / 100,
            total: Math.round(memoryUsage.heapTotal / 1024 / 1024 * 100) / 100,
            percentage: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100)
          }
        }

        res.json({
          success: true,
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

    this.app.get(`${API_PREFIX}/health`, async (req, res) => {
      try {
        const dbHealth = await Database.healthCheck()
        
        const health = {
          status: 'ok',
          service: 'MailTrendz Enhanced API',
          timestamp: new Date(),
          uptime: process.uptime(),
          version: '2.0.0-enhanced',
          environment: process.env.NODE_ENV || 'development',
          database: dbHealth
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

    this.app.use(`${API_PREFIX}/auth`, authRoutes)
    this.app.use(`${API_PREFIX}/projects`, projectRoutes)
    this.app.use(`${API_PREFIX}/chats`, chatRoutes)
    this.app.use(`${API_PREFIX}/ai`, aiRoutes)
    this.app.use(`${API_PREFIX}/enhanced-ai`, enhancedAIRoutes)
    this.app.use(`${API_PREFIX}/users`, userRoutes)

    this.app.get(`${API_PREFIX}`, (req, res) => {
      res.json({
        success: true,
        message: 'MailTrendz Enhanced API v2.0',
        version: '2.0.0-enhanced',
        endpoints: {
          auth: `${API_PREFIX}/auth`,
          projects: `${API_PREFIX}/projects`,
          chats: `${API_PREFIX}/chats`,
          ai: `${API_PREFIX}/ai`,
          enhancedAI: `${API_PREFIX}/enhanced-ai`,
          users: `${API_PREFIX}/users`,
          health: `${API_PREFIX}/health`
        },
        compatibilityFeatures: {
          standardGeneration: `${API_PREFIX}/ai/generate`,
          emailImprovement: `${API_PREFIX}/ai/improve`,
          aiHealthCheck: `${API_PREFIX}/ai/health`
        },
        enhancedFeatures: {
          smartEmailGeneration: `${API_PREFIX}/enhanced-ai/generate`,
          intelligentChat: `${API_PREFIX}/enhanced-ai/chat`,
          promptAnalysis: `${API_PREFIX}/enhanced-ai/analyze`,
          aiComparison: `${API_PREFIX}/enhanced-ai/compare`,
          enhancedStatus: `${API_PREFIX}/enhanced-ai/status`
        },
        changes: {
          added: ['Enhanced AI', 'Compatibility layer', 'Better error handling'],
          improved: ['Performance', 'Response time', 'Error messages'],
          maintained: ['Backward compatibility', 'Existing endpoints']
        },
        timestamp: new Date()
      })
    })
  }

  private initializeErrorHandling(): void {
    this.app.use(notFoundHandler)
    this.app.use(errorHandler)
  }

  public async start(): Promise<void> {
    try {
      await Database.connect()
      
      console.log('🧠 [APP] Sistema com Enhanced AI + Compatibilidade!')
      
      this.app.listen(this.port, () => {
        logger.info(`🚀 MailTrendz Enhanced API running on port ${this.port}`, {
          port: this.port,
          environment: process.env.NODE_ENV || 'development',
          version: '2.0.0-enhanced'
        })
        
        logger.info('📡 Enhanced API endpoints available:', {
          base: `http://localhost:${this.port}`,
          api: `http://localhost:${this.port}${API_PREFIX}`,
          ai: `http://localhost:${this.port}${API_PREFIX}/ai`,
          enhancedAI: `http://localhost:${this.port}${API_PREFIX}/enhanced-ai`,
          health: `http://localhost:${this.port}/health`
        })

        console.log('✨ [APP] IA com Compatibilidade Total:')
        console.log(`   📧 Geração Padrão: POST ${API_PREFIX}/ai/generate`)
        console.log(`   🔧 Melhoria: POST ${API_PREFIX}/ai/improve`) 
        console.log(`   ⚡ Health Check: GET ${API_PREFIX}/ai/health`)
        console.log(`   🚀 Enhanced: POST ${API_PREFIX}/enhanced-ai/generate`)
        console.log(`   💬 Chat Inteligente: POST ${API_PREFIX}/enhanced-ai/chat`)
        console.log(`   🔍 Análise: POST ${API_PREFIX}/enhanced-ai/analyze`)
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
    
    await Database.disconnect()
    
    logger.info('Enhanced server shutdown complete')
    process.exit(0)
  }
}

export default App
