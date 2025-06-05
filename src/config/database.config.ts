import mongoose from 'mongoose'
import { logger } from '../utils/logger'

class Database {
  private static instance: Database
  private isConnected = false

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
      
      await mongoose.connect(mongoUri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        bufferCommands: false
      })

      this.isConnected = true
      logger.info('MongoDB connected successfully', { 
        host: mongoose.connection.host,
        name: mongoose.connection.name 
      })

      // Event listeners para monitoramento
      mongoose.connection.on('error', (error) => {
        logger.error('MongoDB connection error:', error)
        this.isConnected = false
      })

      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected')
        this.isConnected = false
      })

      mongoose.connection.on('reconnected', () => {
        logger.info('MongoDB reconnected')
        this.isConnected = true
      })

      // Graceful shutdown
      process.on('SIGINT', this.gracefulShutdown)
      process.on('SIGTERM', this.gracefulShutdown)

    } catch (error) {
      logger.error('MongoDB connection failed:', error)
      throw error
    }
  }

  public async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return
    }

    try {
      await mongoose.connection.close()
      this.isConnected = false
      logger.info('MongoDB disconnected')
    } catch (error) {
      logger.error('Error disconnecting from MongoDB:', error)
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
      host: mongoose.connection.host,
      name: mongoose.connection.name,
      collections: Object.keys(mongoose.connection.collections)
    }
  }

  private gracefulShutdown = async (): Promise<void> => {
    logger.info('Received shutdown signal, closing MongoDB connection...')
    await this.disconnect()
    process.exit(0)
  }

  // Health check
  public async healthCheck(): Promise<{
    status: 'connected' | 'disconnected'
    responseTime?: number
  }> {
    const startTime = Date.now()
    
    try {
      if (!this.isConnected || !mongoose.connection.db) {
        return { status: 'disconnected' }
      }

      // Ping database
      await mongoose.connection.db.admin().ping()
      
      const responseTime = Date.now() - startTime
      return { 
        status: 'connected', 
        responseTime 
      }
    } catch (error) {
      logger.error('Database health check failed:', error)
      return { status: 'disconnected' }
    }
  }

  // Get database statistics
  public async getStats() {
    try {
      if (!this.isConnected || !mongoose.connection.db) {
        return null
      }

      const stats = await mongoose.connection.db.stats()
      return {
        collections: stats.collections,
        objects: stats.objects,
        avgObjSize: stats.avgObjSize,
        dataSize: stats.dataSize,
        storageSize: stats.storageSize,
        indexes: stats.indexes,
        indexSize: stats.indexSize
      }
    } catch (error) {
      logger.error('Failed to get database stats:', error)
      return null
    }
  }
}

export default Database.getInstance()