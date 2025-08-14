import winston from 'winston'
import path from 'path'

// Criar diretório de logs se não existir
const logsDir = path.join(process.cwd(), 'logs')

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
)

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let metaStr = ''
    if (Object.keys(meta).length > 0) {
      metaStr = ` ${JSON.stringify(meta, null, 2)}`
    }
    return `${timestamp} [${level}]: ${message}${metaStr}`
  })
)

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { 
    service: 'mailtrendz-backend',
    version: process.env.npm_package_version || '1.0.0'
  },
  transports: [
    // Erros em arquivo separado
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    }),

    // Todos os logs em arquivo combinado
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    })
  ],
  
  // Não sair em caso de erro não tratado
  exitOnError: false
})

// Console logs apenas em desenvolvimento
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat,
    level: 'debug'
  }))
}

// Stream para Morgan (HTTP request logging)
export const morganStream = {
  write: (message: string) => {
    logger.info(message.trim(), { type: 'http' })
  }
}

// Helper functions para logging estruturado
export const loggerHelpers = {
  // Log de autenticação
  auth: {
    login: (userId: string, email: string, ip: string) => {
      logger.info('User login', { userId, email, ip, action: 'login' })
    },
    logout: (userId: string, email: string) => {
      logger.info('User logout', { userId, email, action: 'logout' })
    },
    register: (userId: string, email: string, ip: string) => {
      logger.info('User register', { userId, email, ip, action: 'register' })
    },
    failed: (email: string, ip: string, reason: string) => {
      logger.warn('Authentication failed', { email, ip, reason, action: 'auth_failed' })
    }
  },

  // Log de API
  api: {
    request: (method: string, url: string, userId?: string, ip?: string) => {
      logger.info('API request', { method, url, userId, ip, action: 'api_request' })
    },
    response: (method: string, url: string, statusCode: number, responseTime: number) => {
      logger.info('API response', { method, url, statusCode, responseTime, action: 'api_response' })
    },
    error: (method: string, url: string, error: Error, userId?: string) => {
      logger.error('API error', { 
        method, 
        url, 
        error: error.message, 
        stack: error.stack, 
        userId, 
        action: 'api_error' 
      })
    }
  },

  // Log de IA
  ai: {
    generation: (userId: string, prompt: string, model: string, tokens?: number) => {
      logger.info('AI email generation', { 
        userId, 
        prompt: prompt.substring(0, 50), 
        model, 
        tokens,
        action: 'ai_generation' 
      })
    },
    improvement: (userId: string, projectId: string, feedback: string, model: string) => {
      logger.info('AI email improvement', { 
        userId, 
        projectId, 
        feedback: feedback.substring(0, 50), 
        model,
        action: 'ai_improvement' 
      })
    },
    chat: (userId: string, chatId: string, model: string, tokens?: number) => {
      logger.info('AI chat interaction', { 
        userId, 
        chatId, 
        model, 
        tokens,
        action: 'ai_chat' 
      })
    },
    error: (userId: string, operation: string, error: Error) => {
      logger.error('AI operation failed', { 
        userId, 
        operation, 
        error: error.message,
        action: 'ai_error' 
      })
    }
  },

  // Log de projetos
  project: {
    created: (userId: string, projectId: string, type: string) => {
      logger.info('Project created', { userId, projectId, type, action: 'project_created' })
    },
    updated: (userId: string, projectId: string, changes: string[]) => {
      logger.info('Project updated', { userId, projectId, changes, action: 'project_updated' })
    },
    deleted: (userId: string, projectId: string) => {
      logger.info('Project deleted', { userId, projectId, action: 'project_deleted' })
    }
  },

  // Log de performance
  performance: {
    slow: (operation: string, duration: number, threshold: number = 1000) => {
      if (duration > threshold) {
        logger.warn('Slow operation detected', { 
          operation, 
          duration, 
          threshold,
          action: 'performance_slow' 
        })
      }
    },
    memory: (usage: NodeJS.MemoryUsage) => {
      const usedMB = Math.round(usage.heapUsed / 1024 / 1024 * 100) / 100
      if (usedMB > 500) { // Alert se usar mais de 500MB
        logger.warn('High memory usage', { 
          heapUsed: usedMB,
          heapTotal: Math.round(usage.heapTotal / 1024 / 1024 * 100) / 100,
          action: 'performance_memory'
        })
      }
    }
  }
}

// Chat logger específico
export const chatLogger = {
  messageReceived: (data: {
    userId: string,
    chatId: string,
    messageType: string,
    contentLength: number
  }) => {
    logger.info('📨 Chat message received', {
      ...data,
      timestamp: new Date().toISOString(),
      service: 'chat'
    });
  },
  
  messageProcessed: (data: {
    userId: string,
    chatId: string,
    messageId: string,
    role: string,
    processingTime: number
  }) => {
    logger.info('✅ Chat message processed', {
      ...data,
      timestamp: new Date().toISOString(),
      service: 'chat'
    });
  },
  
  messageError: (error: any, context: {
    userId: string,
    chatId: string,
    messageType?: string
  }) => {
    logger.error('❌ Chat message error', {
      error: error.message,
      stack: error.stack,
      ...context,
      timestamp: new Date().toISOString(),
      service: 'chat'
    });
  }
};

export default logger