import App from './app'
import { logger } from './utils/logger'

// Capturar erros não tratados
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', error)
  process.exit(1)
})

process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason)
  process.exit(1)
})

// Inicializar e iniciar aplicação
const app = new App()

app.start().catch((error) => {
  logger.error('Failed to start application:', error)
  process.exit(1)
})