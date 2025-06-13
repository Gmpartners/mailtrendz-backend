import { AIService } from '../AIService'
import PythonAIClient from '../PythonAIClient'

export class EnhancedAIService extends AIService {
  private static instance: EnhancedAIService
  private pythonClient: PythonAIClient

  private constructor() {
    super()
    this.pythonClient = new PythonAIClient()
  }

  public static getInstance(): EnhancedAIService {
    if (!EnhancedAIService.instance) {
      EnhancedAIService.instance = new EnhancedAIService()
    }
    return EnhancedAIService.instance
  }

  public static async healthCheck(): Promise<{ status: string }> {
    try {
      const instance = EnhancedAIService.getInstance()
      const health = await instance.pythonClient.healthCheck()
      return { status: health.status || 'available' }
    } catch (error) {
      return { status: 'error' }
    }
  }

  public async generateEnhancedEmail(prompt: string, context?: any): Promise<any> {
    try {
      return await this.pythonClient.generateEmail(prompt, context)
    } catch (error) {
      return await super.generateEmail(prompt, context)
    }
  }

  public async intelligentChat(message: string, history?: any[]): Promise<any> {
    try {
      return await this.pythonClient.chat(message, history)
    } catch (error) {
      return await super.chatWithAI(message, history)
    }
  }

  public async analyzePrompt(content: string): Promise<any> {
    try {
      return await this.pythonClient.validateHTML(content)
    } catch (error) {
      return { valid: true, suggestions: [] }
    }
  }

  public async compareEmails(contentA: string, contentB: string): Promise<any> {
    try {
      return await this.pythonClient.improveEmail({ html: contentA }, `Compare with: ${contentB}`)
    } catch (error) {
      return { comparison: 'Service unavailable' }
    }
  }
}

export default EnhancedAIService
