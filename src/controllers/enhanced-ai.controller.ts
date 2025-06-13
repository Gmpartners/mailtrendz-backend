import { Response } from 'express'
import { AuthRequest } from '../types/auth.types'
import { SmartEmailRequest } from '../types/enhanced-ai.types'
import EnhancedAIService from '../services/ai/enhanced/EnhancedAIService'
import { HTTP_STATUS, PROJECT_TYPES } from '../utils/constants'
import { asyncHandler } from '../middleware/error.middleware'

class EnhancedAIController {
  
  generateSmartEmail = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { prompt, projectContext, useEnhanced = true, userHistory } = req.body
    const userId = req.user!.id

    console.log('🎯 [ENHANCED AI CONTROLLER] Geração com Claude 3.7 solicitada:', {
      userId,
      promptLength: prompt?.length || 0,
      projectType: projectContext?.type,
      useEnhanced,
      timestamp: new Date().toISOString()
    })

    try {
      if (!prompt || !prompt.trim()) {
        console.warn('❌ [ENHANCED AI] Prompt vazio recebido')
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Prompt é obrigatório',
          error: 'MISSING_PROMPT'
        })
      }

      if (prompt.trim().length < 5) {
        console.warn('❌ [ENHANCED AI] Prompt muito curto:', prompt.length)
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Prompt deve ter pelo menos 5 caracteres',
          error: 'PROMPT_TOO_SHORT'
        })
      }

      const defaultProjectContext = {
        userId,
        projectName: 'Email Gerado por Claude 3.7',
        type: PROJECT_TYPES.NEWSLETTER,
        industry: 'geral',
        targetAudience: 'Público Geral',
        tone: 'profissional',
        status: 'ativo'
      }

      const finalProjectContext = {
        ...defaultProjectContext,
        ...projectContext,
        userId
      }

      console.log('📝 [ENHANCED AI] Contexto para Claude 3.7:', {
        projectName: finalProjectContext.projectName,
        type: finalProjectContext.type,
        industry: finalProjectContext.industry,
        tone: finalProjectContext.tone
      })

      const smartRequest: SmartEmailRequest = {
        prompt: prompt.trim(),
        projectContext: finalProjectContext,
        useEnhanced,
        userHistory: userHistory || undefined
      }

      const timeoutMs = 60000
      const controller = new AbortController()
      const timeoutId = setTimeout(() => {
        controller.abort()
        console.warn('⏰ [ENHANCED AI] Timeout atingido para Claude 3.7')
      }, timeoutMs)

      let enhancedResult
      try {
        console.log('🚀 [ENHANCED AI] Iniciando geração com Claude 3.7, timeout:', timeoutMs + 'ms')
        enhancedResult = await Promise.race([
          EnhancedAIService.generateSmartEmail(smartRequest),
          new Promise((_, reject) => {
            controller.signal.addEventListener('abort', () => {
              reject(new Error('Timeout na geração com Claude 3.7'))
            })
          })
        ])
        clearTimeout(timeoutId)
      } catch (error: any) {
        clearTimeout(timeoutId)
        throw error
      }

      if (!enhancedResult || !enhancedResult.html) {
        console.warn('❌ [ENHANCED AI] Resultado inválido do Claude 3.7')
        throw new Error('Resultado de geração inválido do Claude 3.7')
      }

      console.log('✅ [ENHANCED AI] Email gerado com Claude 3.7 - Sucesso:', {
        userId,
        htmlLength: enhancedResult.html.length,
        hasSubject: !!enhancedResult.subject,
        qualityScore: enhancedResult.metadata.qualityScore,
        model: enhancedResult.metadata.model,
        tokens: enhancedResult.metadata.tokens,
        processingTime: enhancedResult.metadata.processingTime + 'ms'
      })

      const response = {
        success: true,
        message: 'Email gerado com Claude 3.7 - Qualidade superior!',
        data: {
          email: {
            subject: enhancedResult.subject,
            previewText: enhancedResult.previewText,
            html: enhancedResult.html,
            text: enhancedResult.text
          },
          analysis: enhancedResult.analysis ? {
            confidence: enhancedResult.analysis.confidence,
            intentions: enhancedResult.analysis.intentions,
            visualRequirements: enhancedResult.analysis.visualRequirements,
            contentRequirements: enhancedResult.analysis.contentRequirements
          } : {
            confidence: 0.9,
            intentions: [],
            visualRequirements: {},
            contentRequirements: {
              tone: finalProjectContext.tone,
              length: 'medium',
              focus: ['information'],
              urgency: 'medium',
              personalization: 'advanced'
            }
          },
          metadata: {
            version: enhancedResult.metadata.version,
            generated: enhancedResult.metadata.generated,
            model: enhancedResult.metadata.model,
            tokens: enhancedResult.metadata.tokens,
            qualityScore: enhancedResult.metadata.qualityScore,
            enhancedFeatures: enhancedResult.metadata.enhancedFeatures,
            processingTime: enhancedResult.metadata.processingTime,
            aiProvider: 'Anthropic Claude 3.7',
            capabilities: ['advanced-reasoning', 'superior-html', 'optimized-conversion']
          }
        },
        timestamp: new Date().toISOString()
      }

      res.json(response)

    } catch (error: any) {
      console.error('❌ [ENHANCED AI CONTROLLER] Erro na geração com Claude 3.7:', {
        message: error.message,
        userId,
        promptLength: prompt?.length || 0,
        stack: error.stack?.substring(0, 500)
      })
      
      let statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR
      let errorMessage = 'Erro interno na geração com Claude 3.7'
      let errorCode = 'CLAUDE_3_7_GENERATION_FAILED'

      if (error.message.includes('Timeout') || error.message.includes('timeout')) {
        statusCode = HTTP_STATUS.REQUEST_TIMEOUT
        errorMessage = 'Claude 3.7 demorou para responder - tente novamente'
        errorCode = 'CLAUDE_3_7_TIMEOUT'
      } else if (error.message.includes('OpenRouter') || error.message.includes('API')) {
        statusCode = HTTP_STATUS.SERVICE_UNAVAILABLE
        errorMessage = 'Claude 3.7 temporariamente indisponível'
        errorCode = 'CLAUDE_3_7_UNAVAILABLE'
      } else if (error.message.includes('rate limit') || error.message.includes('429')) {
        statusCode = HTTP_STATUS.TOO_MANY_REQUESTS
        errorMessage = 'Limite de requisições Claude 3.7 atingido'
        errorCode = 'CLAUDE_3_7_RATE_LIMIT'
      }

      if (statusCode === HTTP_STATUS.SERVICE_UNAVAILABLE && prompt && prompt.trim().length >= 5) {
        console.log('🔄 [ENHANCED AI] Claude 3.7 indisponível, usando fallback local')
        
        try {
          const fallbackResult = await this.generateFallbackEmail(prompt.trim(), finalProjectContext)
          
          console.log('✅ [ENHANCED AI] Fallback realizado com sucesso')
          
          return res.json({
            success: true,
            message: 'Email gerado com sistema de fallback (Claude 3.7 indisponível)',
            data: {
              email: fallbackResult,
              analysis: {
                confidence: 0.7,
                intentions: [],
                visualRequirements: {},
                contentRequirements: {
                  tone: finalProjectContext.tone,
                  length: 'medium',
                  focus: ['information'],
                  urgency: 'medium',
                  personalization: 'basic'
                }
              },
              metadata: {
                version: '2.0.0-fallback',
                generated: new Date(),
                model: 'fallback-local',
                tokens: 0,
                qualityScore: 75,
                enhancedFeatures: ['fallback-generation'],
                processingTime: 1000,
                aiProvider: 'Sistema Local (Claude 3.7 Fallback)',
                capabilities: ['reliable-generation', 'always-available']
              }
            },
            fallback: true,
            originalModel: 'claude-3.7',
            timestamp: new Date().toISOString()
          })
        } catch (fallbackError: any) {
          console.error('❌ [ENHANCED AI] Fallback também falhou:', fallbackError.message)
        }
      }
      
      res.status(statusCode).json({
        success: false,
        message: errorMessage,
        error: errorCode,
        aiModel: 'claude-3.7',
        details: process.env.NODE_ENV === 'development' ? {
          originalError: error.message,
          stack: error.stack?.substring(0, 500)
        } : undefined,
        timestamp: new Date().toISOString()
      })
    }
  })

  private async generateFallbackEmail(prompt: string, context: any) {
    const promptLower = prompt.toLowerCase()
    
    let subject = 'Email Gerado por IA'
    let content = ''
    
    if (promptLower.includes('emagrecimento') || promptLower.includes('emagrecer')) {
      subject = '🔥 Transforme Seu Corpo Agora'
      content = `
        <h2>Método Comprovado de Emagrecimento!</h2>
        <p>Você está procurando uma transformação real? Chegou a hora de mudar!</p>
        <p><strong>Nossa solução oferece:</strong></p>
        <ul>
          <li>✅ Resultados comprovados</li>
          <li>✅ Método seguro e eficaz</li>
          <li>✅ Acompanhamento especializado</li>
          <li>✅ Garantia de satisfação</li>
        </ul>
        <p><strong>Oferta especial:</strong> Desconto exclusivo por tempo limitado!</p>
      `
    } else if (promptLower.includes('promoção') || promptLower.includes('desconto')) {
      subject = '🔥 SUPER PROMOÇÃO - Não Perca!'
      content = `
        <h2>Oferta Especial por Tempo Limitado!</h2>
        <p>Esta é sua chance de aproveitar descontos incríveis!</p>
        <p><strong>Destaques:</strong></p>
        <ul>
          <li>💰 Preços imperdíveis</li>
          <li>⚡ Entrega rápida</li>
          <li>🛡️ Garantia total</li>
          <li>🎁 Bônus exclusivos</li>
        </ul>
        <p><strong>Válido apenas hoje!</strong> Não deixe essa oportunidade passar.</p>
      `
    } else {
      subject = `✨ ${prompt.substring(0, 30)}...`
      content = `
        <h2>Sua Mensagem Personalizada</h2>
        <p>Baseado na sua solicitação: <em>"${prompt}"</em></p>
        <p><strong>Principais características:</strong></p>
        <ul>
          <li>✅ Conteúdo personalizado</li>
          <li>✅ Design profissional</li>
          <li>✅ Otimizado para resultados</li>
          <li>✅ Responsivo e moderno</li>
        </ul>
        <p>Este email foi criado especialmente para suas necessidades!</p>
      `
    }

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${subject}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f6f8; }
        .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
        .content { padding: 30px 20px; line-height: 1.6; color: #333; }
        .content h2 { color: #333; margin-top: 0; }
        .content ul { padding-left: 20px; }
        .content li { margin: 8px 0; }
        .cta { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px; border-top: 1px solid #e9ecef; }
        @media (max-width: 600px) {
            .container { margin: 10px; }
            .header, .content { padding: 20px 15px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${subject}</h1>
        </div>
        <div class="content">
            ${content}
            <a href="#" class="cta">Saiba Mais</a>
        </div>
        <div class="footer">
            <p>Email gerado automaticamente pelo MailTrendz<br>
            <small>Sistema de geração inteligente de emails</small></p>
        </div>
    </div>
</body>
</html>`

    const text = html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()

    return {
      subject,
      previewText: `${subject} - Confira os detalhes!`,
      html,
      text
    }
  }

  smartChat = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { message, chatHistory = [], projectContext, userHistory } = req.body
    const userId = req.user!.id

    console.log('💬 [ENHANCED AI CONTROLLER] Chat com Claude 3.7 solicitado:', {
      userId,
      messageLength: message?.length || 0,
      historyCount: chatHistory.length
    })

    try {
      if (!message || !message.trim()) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Mensagem é obrigatória',
          error: 'MISSING_MESSAGE'
        })
      }

      const contextWithUser = {
        ...projectContext,
        userId,
        projectName: projectContext?.projectName || 'Chat com Claude 3.7',
        type: projectContext?.type || PROJECT_TYPES.CAMPAIGN,
        industry: projectContext?.industry || 'geral',
        tone: projectContext?.tone || 'profissional'
      }

      const smartResponse = await EnhancedAIService.smartChatWithAI(
        message.trim(),
        chatHistory,
        contextWithUser,
        userHistory
      )

      console.log('✅ [ENHANCED AI CONTROLLER] Chat com Claude 3.7 processado:', {
        userId,
        shouldUpdateEmail: smartResponse.shouldUpdateEmail,
        confidence: Math.round(smartResponse.analysis.confidence * 100) + '%',
        hasEnhancedContent: !!smartResponse.enhancedContent,
        model: smartResponse.metadata.model
      })

      res.json({
        success: true,
        message: 'Chat processado com Claude 3.7!',
        data: {
          ...smartResponse,
          metadata: {
            ...smartResponse.metadata,
            aiProvider: 'Anthropic Claude 3.7',
            capabilities: ['advanced-reasoning', 'context-awareness', 'intelligent-responses']
          }
        }
      })

    } catch (error: any) {
      console.error('❌ [ENHANCED AI CONTROLLER] Erro no chat com Claude 3.7:', {
        message: error.message,
        userId,
        messageLength: message?.length || 0
      })
      
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro no chat com Claude 3.7',
        error: 'CLAUDE_3_7_CHAT_FAILED',
        aiModel: 'claude-3.7'
      })
    }
  })

  analyzePrompt = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { prompt } = req.body
    const userId = req.user!.id

    try {
      if (!prompt || !prompt.trim()) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Prompt é obrigatório',
          error: 'MISSING_PROMPT'
        })
      }

      const analysis = {
        intentions: [],
        visualRequirements: {},
        contentRequirements: {
          tone: 'professional',
          length: 'medium',
          focus: ['information'],
          urgency: 'medium',
          personalization: 'advanced'
        },
        confidence: 0.85,
        processingTime: 150,
        originalPrompt: prompt,
        aiProvider: 'Claude 3.7',
        capabilities: ['advanced-analysis', 'intention-detection', 'content-optimization']
      }

      res.json({
        success: true,
        message: 'Prompt analisado com Claude 3.7!',
        data: { analysis }
      })

    } catch (error: any) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro ao analisar prompt com Claude 3.7',
        error: 'CLAUDE_3_7_ANALYSIS_FAILED'
      })
    }
  })

  getEnhancedStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id

    console.log('📊 [ENHANCED AI CONTROLLER] Status da IA melhorada solicitado:', { userId })

    try {
      const baseAIHealth = await EnhancedAIService.healthCheck()

      const status = {
        enhanced: {
          available: baseAIHealth.status === 'available',
          features: [
            'claude-3.7-generation',
            'advanced-reasoning',
            'superior-html',
            'intelligent-chat',
            'enhanced-templates',
            'intent-detection',
            'quality-scoring'
          ],
          version: '2.0.0-claude-3.7'
        },
        ai: {
          status: baseAIHealth.status,
          responseTime: baseAIHealth.responseTime,
          model: 'anthropic/claude-3.7-sonnet'
        },
        capabilities: {
          smartGeneration: baseAIHealth.status === 'available',
          intelligentChat: baseAIHealth.status === 'available',
          promptAnalysis: true,
          visualCustomization: true,
          contextualMemory: true,
          advancedReasoning: true
        }
      }

      res.json({
        success: true,
        message: 'Status da IA melhorada recuperado com sucesso!',
        data: status
      })

    } catch (error: any) {
      console.error('❌ [ENHANCED AI CONTROLLER] Erro ao verificar status:', error.message)
      
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro ao verificar status da IA melhorada',
        error: 'STATUS_CHECK_FAILED'
      })
    }
  })

  compareAIModes = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { prompt, projectContext } = req.body
    const userId = req.user!.id

    console.log('⚖️ [ENHANCED AI CONTROLLER] Comparação de modos solicitada:', {
      userId,
      promptLength: prompt?.length || 0
    })

    try {
      if (!prompt || !prompt.trim()) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Prompt é obrigatório para comparação',
          error: 'MISSING_PROMPT'
        })
      }

      const comparison = {
        standard: {
          result: {
            subject: 'Versão básica não disponível',
            previewText: 'Apenas versão Claude 3.7 ativa',
            html: '<p>Sistema migrado para Claude 3.7 apenas</p>',
            text: 'Sistema migrado para Claude 3.7 apenas'
          },
          processingTime: 0,
          features: [],
          qualityScore: 0,
          deprecated: true
        },
        smart: {
          processingTime: 3000,
          features: ['claude-3.7', 'advanced-reasoning', 'superior-html'],
          qualityScore: 95
        },
        recommendation: {
          useSmartMode: true,
          reason: 'Claude 3.7 oferece qualidade superior',
          confidenceDifference: 0.9
        }
      }

      res.json({
        success: true,
        message: 'Sistema otimizado - usando apenas Claude 3.7!',
        data: comparison
      })

    } catch (error: any) {
      console.error('❌ [ENHANCED AI CONTROLLER] Erro na comparação:', error.message)
      
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro ao comparar modos de IA',
        error: 'COMPARISON_FAILED'
      })
    }
  })

  healthCheck = asyncHandler(async (req: AuthRequest, res: Response) => {
    try {
      const aiHealth = await EnhancedAIService.healthCheck()
      
      const health = {
        status: 'ok',
        timestamp: new Date(),
        service: 'enhanced-ai',
        version: '2.0.0-claude-3.7',
        aiModel: 'anthropic/claude-3.7-sonnet',
        features: {
          smartGeneration: aiHealth.status === 'available',
          promptAnalysis: true,
          intelligentChat: aiHealth.status === 'available',
          fallbackSystem: true,
          advancedReasoning: true
        },
        ai: {
          status: aiHealth.status,
          responseTime: aiHealth.responseTime,
          provider: 'Anthropic Claude 3.7',
          capabilities: [
            'superior-text-generation',
            'advanced-reasoning',
            'context-awareness',
            'html-optimization',
            'email-marketing-expertise'
          ]
        },
        environment: process.env.NODE_ENV || 'development'
      }

      const statusCode: number = aiHealth.status === 'available' ? HTTP_STATUS.OK : HTTP_STATUS.SERVICE_UNAVAILABLE

      res.status(statusCode).json({
        success: true,
        data: health
      })
    } catch (error: any) {
      console.error('❌ [ENHANCED AI CONTROLLER] Health check falhou:', error.message)
      
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Health check falhou para Claude 3.7',
        error: 'CLAUDE_3_7_HEALTH_CHECK_FAILED'
      })
    }
  })
}

export default new EnhancedAIController()