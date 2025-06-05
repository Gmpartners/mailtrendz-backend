import dotenv from 'dotenv'
import Database from '../src/config/database.config'
import { logger } from '../src/utils/logger'
import fs from 'fs'
import path from 'path'

dotenv.config()

async function validateSetup() {
  try {
    logger.info('🔍 Validating backend setup...')
    
    // 1. Verificar variáveis de ambiente obrigatórias
    const requiredEnvVars = [
      'MONGODB_URI',
      'JWT_SECRET',
      'JWT_REFRESH_SECRET'
    ]
    
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName])
    
    if (missingVars.length > 0) {
      logger.error('❌ Missing required environment variables:', missingVars)
      return false
    }
    
    logger.info('✅ Environment variables check passed')
    
    // 2. Testar conexão com MongoDB
    try {
      await Database.connect()
      const dbHealth = await Database.healthCheck()
      
      if (dbHealth.status === 'connected') {
        logger.info('✅ MongoDB connection successful')
      } else {
        logger.error('❌ MongoDB connection failed')
        return false
      }
    } catch (error) {
      logger.error('❌ MongoDB connection error:', error)
      return false
    }
    
    // 3. Verificar estrutura de diretórios
    const requiredDirs = ['src', 'logs', 'scripts']
    
    for (const dir of requiredDirs) {
      if (!fs.existsSync(path.join(process.cwd(), dir))) {
        logger.error(`❌ Missing required directory: ${dir}`)
        return false
      }
    }
    
    logger.info('✅ Directory structure check passed')
    
    // 4. Verificar OpenRouter API Key (opcional)
    if (process.env.OPENROUTER_API_KEY) {
      logger.info('✅ OpenRouter API key configured')
    } else {
      logger.warn('⚠️ OpenRouter API key not configured - IA features will not work')
    }
    
    // 5. Testar JWT secrets
    if (process.env.JWT_SECRET === 'your-super-secret-jwt-key-change-this-in-production') {
      logger.warn('⚠️ Using default JWT secret - change this in production!')
    } else {
      logger.info('✅ Custom JWT secret configured')
    }
    
    logger.info('🎉 Backend setup validation completed successfully!')
    logger.info('📋 Next steps:')
    logger.info('   1. Configure OpenRouter API key for AI features')
    logger.info('   2. Run: npm run db:seed (to add test data)')
    logger.info('   3. Run: npm run dev (to start development server)')
    logger.info('   4. Visit: http://localhost:8000/health (to verify API)')
    
    return true
    
  } catch (error) {
    logger.error('💥 Setup validation failed:', error)
    return false
  } finally {
    await Database.disconnect()
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  validateSetup()
    .then((success) => {
      process.exit(success ? 0 : 1)
    })
    .catch((error) => {
      logger.error('💥 Validation error:', error)
      process.exit(1)
    })
}

export default validateSetup