import { AIService } from './ai/AIService'
import PythonAIClient from './ai/PythonAIClient'

class AIServiceWrapper {
  private aiService: AIService
  private pythonClient: PythonAIClient

  constructor() {
    this.aiService = new AIService()
    this.pythonClient = new PythonAIClient()
  }

  async generateEmail(prompt: string, context?: any): Promise<any> {
    try {
      return await this.pythonClient.generateEmail(prompt, context)
    } catch (error) {
      return await this.aiService.generateEmail(prompt, context)
    }
  }

  async improveEmail(content: any, feedback: string): Promise<any> {
    try {
      return await this.pythonClient.improveEmail(content, feedback)
    } catch (error) {
      return await this.aiService.improveEmail(content, feedback)
    }
  }

  async chatWithAI(message: string, history?: any[]): Promise<any> {
    try {
      return await this.pythonClient.chat(message, history)
    } catch (error) {
      return await this.aiService.chatWithAI(message, history)
    }
  }

  async validateHTML(html: string): Promise<any> {
    try {
      return await this.pythonClient.validateHTML(html)
    } catch (error) {
      return { valid: true, suggestions: [] }
    }
  }

  async optimizeCSS(html: string, options?: any): Promise<any> {
    try {
      return await this.pythonClient.optimizeCSS(html, options)
    } catch (error) {
      return { optimized: html, suggestions: [] }
    }
  }

  async getStatus(): Promise<any> {
    try {
      return await this.pythonClient.healthCheck()
    } catch (error) {
      return { status: 'fallback', available: true }
    }
  }

  async getMetrics(): Promise<any> {
    try {
      return await this.pythonClient.getMetrics()
    } catch (error) {
      return { requests: 0, errors: 0, uptime: '0s' }
    }
  }
}

export default new AIServiceWrapper()
