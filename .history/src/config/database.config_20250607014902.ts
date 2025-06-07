import mongoose from 'mongoose'
import { logger } from '../utils/logger'

class Database {
  private static instance: Database
  private isConnected = false
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5

  private constructor() {}

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database()
    }
    return Database.instance
  }

  public async connect(): Promise<void> {
    if (this.isConnected) {
      logger.info('Database already connected')
      return
    }

    try {
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/mailtrendz'
      
      // ✅ CONFIGURAÇÃO OTIMIZADA PARA MONGODB ATLAS
      const connectionOptions = {
        // Connection Pool Settings
        maxPoolSize: 10,
        minPoolSize: 2,
        maxIdleTimeMS: 30000,
        
        // Timeouts otimizados para Render.com/Atlas
        serverSelectionTimeoutMS: 30000, // Aumentado para 30s
        socketTimeoutMS: 45000,
        connectTimeoutMS: 30000,
        
        // Buffer settings
        bufferCommands: false,
        bufferMaxEntries: 0,
        
        // Retry settings
        retryWrites: true,
        retryReads: true,
        
        // Heartbeat
        heartbeatFrequencyMS: 10000,
        
        // Compressão para melhor performance
        compressors: 'zlib',
        
        // Auth settings
        authMechanism: 'SCRAM-SHA-1'
      }

      logger.info('Attempting MongoDB connection...', {
        uri: mongoUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'), // Mascarar credenciais
        options: {
          serverSelectionTimeoutMS: connectionOptions.serverSelectionTimeoutMS,
          socketTimeoutMS: connectionOptions.socketTimeoutMS,
          maxPoolSize: connectionOptions.maxPoolSize
        }
      })
      
      await mongoose.connect(mongoUri, connectionOptions)

      this.isConnected = true
      this.reconnectAttempts = 0
      
      logger.info('✅ MongoDB connected successfully', { 
        host: mongoose.connection.host,
        name: mongoose.connection.name,
        readyState: mongoose.connection.readyState
      })

      // ✅ EVENT LISTENERS MELHORADOS
      mongoose.connection.on('error', (error) => {
        logger.error('❌ MongoDB connection error:', {
          error: error.message,
          stack: error.stack,
          name: error.name
        })
        this.isConnected = false
      })

      mongoose.connection.on('disconnected', () => {
        logger.warn('⚠️ MongoDB disconnected')
        this.isConnected = false
        this.handleReconnect()
      })

      mongoose.connection.on('reconnected', () => {
        logger.info('✅ MongoDB reconnected')
        this.isConnected = true
        this.reconnectAttempts = 0
      })

      mongoose.connection.on('close', () => {
        logger.info('🔒 MongoDB connection closed')
        this.isConnected = false
      })

      mongoose.connection.on('fullsetup', () => {
        logger.info('🎯 MongoDB replica set fully connected')
      })

      // Graceful shutdown
      process.on('SIGINT', this.gracefulShutdown)
      process.on('SIGTERM', this.gracefulShutdown)

    } catch (error: any) {
      logger.error('❌ MongoDB connection failed:', {
        error: error.message,
        stack: error.stack,
        code: error.code,
        codeName: error.codeName
      })
      
      this.isConnected = false
      
      // ✅ TENTAR RECONECTAR AUTOMATICAMENTE
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        await this.handleReconnect()
      } else {
        throw error
      }
    }
  }

  // ✅ NOVA FUNCIONALIDADE: Auto-reconnect
  private async handleReconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('❌ Max reconnection attempts reached')
      return
    }

    this.reconnectAttempts++
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000) // Exponential backoff, max 30s

    logger.info(`🔄 Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms...`)

    setTimeout(async () => {
      try {
        if (!this.isConnected) {
          await this.connect()
        }
      } catch (error) {
        logger.error('❌ Reconnection attempt failed:', error)
      }
    }, delay)
  }

  public async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return
    }

    try {
      await mongoose.connection.close()
      this.isConnected = false
      logger.info('📴 MongoDB disconnected gracefully')
    } catch (error) {
      logger.error('❌ Error disconnecting from MongoDB:', error)
      throw error
    }
  }

  public isConnectionReady(): boolean {
    return this.isConnected && mongoose.connection.readyState === 1
  }

  public getConnectionInfo() {
    return {
      isConnected: this.isConnected,
      readyState: mongoose.connection.readyState,
      readyStateString: this.getReadyStateString(mongoose.connection.readyState),
      host: mongoose.connection.host,
      name: mongoose.connection.name,
      collections: Object.keys(mongoose.connection.collections),
      reconnectAttempts: this.reconnectAttempts
    }
  }

  private getReadyStateString(state: number): string {
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    }
    return states[state as keyof typeof states] || 'unknown'
  }

  private gracefulShutdown = async (): Promise<void> => {
    logger.info('🛑 Received shutdown signal, closing MongoDB connection...')
    await this.disconnect()
    process.exit(0)
  }

  // ✅ HEALTH CHECK MELHORADO
  public async healthCheck(): Promise<{
    status: 'connected' | 'disconnected' | 'connecting'
    responseTime?: number
    error?: string
  }> {
    const startTime = Date.now()
    
    try {
      if (!this.isConnected) {
        return { 
          status: 'disconnected',
          error: 'Not connected to database'
        }
      }

      if (mongoose.connection.readyState === 2) {
        return {
          status: 'connecting',
          error: 'Connection in progress'
        }
      }

      if (!mongoose.connection.db) {
        return { 
          status: 'disconnected',
          error: 'Database instance not available'
        }
      }

      // Ping database com timeout
      const pingPromise = mongoose.connection.db.admin().ping()
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Health check timeout')), 5000)
      )

      await Promise.race([pingPromise, timeoutPromise])
      
      const responseTime = Date.now() - startTime
      return { 
        status: 'connected', 
        responseTime 
      }
    } catch (error: any) {
      logger.error('❌ Database health check failed:', {
        error: error.message,
        duration: Date.now() - startTime
      })
      
      return { 
        status: 'disconnected',
        error: error.message,
        responseTime: Date.now() - startTime
      }
    }
  }

  // ✅ DATABASE STATISTICS MELHORADO
  public async getStats() {
    try {
      if (!this.isConnected || !mongoose.connection.db) {
        return {
          error: 'Database not connected',
          timestamp: new Date().toISOString()
        }
      }

      const stats = await mongoose.connection.db.stats()
      return {
        collections: stats.collections,
        objects: stats.objects,
        avgObjSize: Math.round(stats.avgObjSize || 0),
        dataSize: Math.round(stats.dataSize || 0),
        storageSize: Math.round(stats.storageSize || 0),
        indexes: stats.indexes,
        indexSize: Math.round(stats.indexSize || 0),
        timestamp: new Date().toISOString(),
        connection: {
          readyState: mongoose.connection.readyState,
          host: mongoose.connection.host,
          name: mongoose.connection.name
        }
      }
    } catch (error: any) {
      logger.error('❌ Failed to get database stats:', error)
      return {
        error: error.message,
        timestamp: new Date().toISOString()
      }
    }
  }

  // ✅ NOVA FUNCIONALIDADE: Verificar específica collection
  public async checkCollection(collectionName: string): Promise<boolean> {
    try {
      if (!this.isConnected || !mongoose.connection.db) {
        return false
      }

      const collections = await mongoose.connection.db.listCollections().toArray()
      return collections.some(col => col.name === collectionName)
    } catch (error) {
      logger.error(`❌ Failed to check collection ${collectionName}:`, error)
      return false
    }
  }
}

export default Database.getInstance()
