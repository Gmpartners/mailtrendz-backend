// ✅ STUB - AI Service Legacy (DESABILITADO)
// Este serviço foi substituído pelo Python AI Service

export class AIService {
  static async generateEmail(prompt: string, options: any = {}) {
    console.warn('⚠️ [AI SERVICE] Legacy AI Service chamado - use Python AI Service')
    return {
      success: false,
      message: 'Legacy AI Service desabilitado - usando Python AI Service',
      redirect: '/api/v1/ai/generate',
      data: null
    }
  }

  static async improveEmail(content: string, instructions: string) {
    console.warn('⚠️ [AI SERVICE] Legacy AI Service chamado - use Python AI Service')
    return {
      success: false,
      message: 'Legacy AI Service desabilitado - usando Python AI Service',
      redirect: '/api/v1/ai/modify',
      data: null
    }
  }

  static async healthCheck() {
    return {
      status: 'disabled',
      message: 'Legacy AI Service desabilitado - usando Python AI Service',
      python_ai_service: process.env.PYTHON_AI_SERVICE_URL || 'http://localhost:5000'
    }
  }

  static async getStatus() {
    return {
      status: 'disabled',
      message: 'Legacy AI Service desabilitado - usando Python AI Service',
      active_service: 'python-ai-service',
      python_url: process.env.PYTHON_AI_SERVICE_URL || 'http://localhost:5000'
    }
  }
}

export default AIService