import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'
import dotenv from 'dotenv'

// Configurar variáveis de ambiente
dotenv.config()

// Importar configurações
import Database from './config/database.config'
import corsOptions from './config/cors.config'
import { logger, morganStream } from './utils/logger'
import { API_PREFIX } from './utils/constants'

// Importar middlewares
import { 
  errorHandler, 
  notFoundHandler, 
  performanceLogger 
} from './middleware/error.middleware'
import { generalLimiter } from './middleware/rate-limit.middleware'

// Importar rotas
import authRoutes from './routes/auth.routes'
import projectRoutes from './routes/project.routes'
import chatRoutes from './routes/chat.routes'
import aiRoutes from './routes/ai.routes'
import userRoutes from './routes/user.routes'

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
    // Logs de requisições HTTP
    this.app.use(morgan('combined', { stream: morganStream }))
    
    // Performance logger
    this.app.use(performanceLogger)
    
    // Segurança
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
    
    // CORS
    this.app.use(cors(corsOptions))
    
    // Compressão
    this.app.use(compression())
    
    // Rate limiting geral
    this.app.use(generalLimiter)
    
    // Parse de JSON e URL encoded
    this.app.use(express.json({ limit: '10mb' }))
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }))
    
    // Parse de cookies
    this.app.use(cookieParser())
    
    // Headers de segurança adicionais
    this.app.use((req, res, next) => {
      res.setHeader('X-Content-Type-Options', 'nosniff')
      res.setHeader('X-Frame-Options', 'DENY')
      res.setHeader('X-XSS-Protection', '1; mode=block')
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
      next()
    })
    
    // Request ID para tracking
    this.app.use((req, res, next) => {
      req.headers['x-request-id'] = req.headers['x-request-id'] || 
        `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      next()
    })
  }

  private initializeRoutes(): void {
    // Rota de health check raiz
    this.app.get('/', (req, res) => {
      res.json({
        success: true,
        message: 'MailTrendz API is running!',
        version: process.env.npm_package_version || '1.0.0',
        timestamp: new Date(),
        environment: process.env.NODE_ENV || 'development'
      })
    })

    // Rota de health check detalhada
    this.app.get('/health', async (req, res) => {
      try {
        const dbHealth = await Database.healthCheck()
        const memoryUsage = process.memoryUsage()
        
        const health = {
          status: 'ok',
          timestamp: new Date(),
          uptime: process.uptime(),
          version: process.env.npm_package_version || '1.0.0',
          environment: process.env.NODE_ENV || 'development',
          services: {
            database: dbHealth,
            api: { status: 'ok' }
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

    // Health check da API (padronizado)
    this.app.get(`${API_PREFIX}/health`, async (req, res) => {
      try {
        const dbHealth = await Database.healthCheck()
        
        const health = {
          status: 'ok',
          service: 'MailTrendz API',
          timestamp: new Date(),
          uptime: process.uptime(),
          version: process.env.npm_package_version || '1.0.0',
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

    // API Routes
    this.app.use(`${API_PREFIX}/auth`, authRoutes)
    this.app.use(`${API_PREFIX}/projects`, projectRoutes)
    this.app.use(`${API_PREFIX}/chats`, chatRoutes)
    this.app.use(`${API_PREFIX}/ai`, aiRoutes)
    this.app.use(`${API_PREFIX}/users`, userRoutes)

    // Rota de informações da API
    this.app.get(`${API_PREFIX}`, (req, res) => {
      res.json({
        success: true,
        message: 'MailTrendz API v1',
        version: process.env.npm_package_version || '1.0.0',
        endpoints: {
          auth: `${API_PREFIX}/auth`,
          projects: `${API_PREFIX}/projects`,
          chats: `${API_PREFIX}/chats`,
          ai: `${API_PREFIX}/ai`,
          users: `${API_PREFIX}/users`,
          health: `${API_PREFIX}/health`
        },
        documentation: `${API_PREFIX}/docs`,
        timestamp: new Date()
      })
    })
  }

  private initializeErrorHandling(): void {
    // 404 handler
    this.app.use(notFoundHandler)
    
    // Error handler global
    this.app.use(errorHandler)
  }

  public async start(): Promise<void> {
    try {
      // Conectar ao banco de dados
      await Database.connect()
      
      // Iniciar servidor
      this.app.listen(this.port, () => {
        logger.info(`🚀 Server running on port ${this.port}`, {
          port: this.port,
          environment: process.env.NODE_ENV || 'development',
          version: process.env.npm_package_version || '1.0.0'
        })
        
        logger.info('📡 API endpoints available:', {
          base: `http://localhost:${this.port}`,
          api: `http://localhost:${this.port}${API_PREFIX}`,
          health: `http://localhost:${this.port}/health`
        })
      })
      
      // Graceful shutdown
      process.on('SIGTERM', this.gracefulShutdown.bind(this))
      process.on('SIGINT', this.gracefulShutdown.bind(this))
      
    } catch (error) {
      logger.error('Failed to start server:', error)
      process.exit(1)
    }
  }

  private async gracefulShutdown(signal: string): Promise<void> {
    logger.info(`Received ${signal}, shutting down gracefully...`)
    
    // Fechar conexões do banco
    await Database.disconnect()
    
    logger.info('Server shutdown complete')
    process.exit(0)
  }
}

export default App