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

    console.log('🎯 [ENHANCED AI CONTROLLER] Geração inteligente solicitada:', {
      userId,
      promptLength: prompt?.length || 0,
      projectType: projectContext?.type,
      useEnhanced
    })

    if (!prompt || !prompt.trim()) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Prompt é obrigatório',
        error: 'MISSING_PROMPT'
      })
    }

    if (!projectContext || !projectContext.type) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Contexto do projeto é obrigatório',
        error: 'MISSING_PROJECT_CONTEXT'
      })
    }

    const validProjectTypes = Object.values(PROJECT_TYPES)
    const validType = validProjectTypes.includes(projectContext.type) 
      ? projectContext.type 
      : PROJECT_TYPES.CAMPAIGN

    const smartRequest: SmartEmailRequest = {
      prompt: prompt.trim(),
      projectContext: {
        userId,
        projectName: projectContext.projectName || 'Projeto Inteligente',
        type: validType,
        industry: projectContext.industry || 'geral',
        targetAudience: projectContext.targetAudience,
        tone: projectContext.tone || 'profissional',
        status: projectContext.status || 'ativo'
      },
      useEnhanced,
      userHistory: userHistory || undefined
    }

    try {
      const enhancedResult = await EnhancedAIService.generateSmartEmail(smartRequest)

      console.log('✅ [ENHANCED AI CONTROLLER] Email inteligente gerado:', {
        userId,
        confidence: Math.round(enhancedResult.analysis.confidence * 100) + '%',
        intentionsCount: enhancedResult.analysis.intentions.length,
        enhancedFeatures: enhancedResult.metadata.enhancedFeatures.length,
        qualityScore: enhancedResult.metadata.qualityScore
      })

      res.json({
        success: true,
        message: 'Email inteligente gerado com sucesso!',
        data: {
          email: enhancedResult,
          analysis: {
            confidence: enhancedResult.analysis.confidence,
            intentions: enhancedResult.analysis.intentions,
            visualRequirements: enhancedResult.analysis.visualRequirements,
            contentRequirements: enhancedResult.analysis.contentRequirements
          },
          metadata: enhancedResult.metadata
        }
      })

    } catch (error: any) {
      console.error('❌ [ENHANCED AI CONTROLLER] Erro na geração inteligente:', error.message)
      
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro ao gerar email inteligente: ' + error.message,
        error: 'SMART_GENERATION_FAILED'
      })
    }
  })

  smartChat = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { message, chatHistory = [], projectContext, userHistory } = req.body
    const userId = req.user!.id

    console.log('💬 [ENHANCED AI CONTROLLER] Chat inteligente solicitado:', {
      userId,
      messageLength: message?.length || 0,
      historyCount: chatHistory.length,
      projectType: projectContext?.type
    })

    if (!message || !message.trim()) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Mensagem é obrigatória',
        error: 'MISSING_MESSAGE'
      })
    }

    if (!projectContext) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Contexto do projeto é obrigatório',
        error: 'MISSING_PROJECT_CONTEXT'
      })
    }

    const contextWithUser = {
      ...projectContext,
      userId,
      projectName: projectContext.projectName || 'Chat Inteligente',
      type: projectContext.type || PROJECT_TYPES.CAMPAIGN,
      industry: projectContext.industry || 'geral',
      tone: projectContext.tone || 'profissional'
    }

    try {
      const smartResponse = await EnhancedAIService.smartChatWithAI(
        message.trim(),
        chatHistory,
        contextWithUser,
        userHistory
      )

      console.log('✅ [ENHANCED AI CONTROLLER] Chat inteligente processado:', {
        userId,
        shouldUpdateEmail: smartResponse.shouldUpdateEmail,
        confidence: Math.round(smartResponse.analysis.confidence * 100) + '%',
        hasEnhancedContent: !!smartResponse.enhancedContent,
        enhancedFeatures: smartResponse.metadata.enhancedFeatures.length
      })

      res.json({
        success: true,
        message: 'Chat inteligente processado com sucesso!',
        data: smartResponse
      })

    } catch (error: any) {
      console.error('❌ [ENHANCED AI CONTROLLER] Erro no chat inteligente:', error.message)
      
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro no chat inteligente: ' + error.message,
        error: 'SMART_CHAT_FAILED'
      })
    }
  })

  analyzePrompt = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { prompt, projectContext, userHistory } = req.body
    const userId = req.user!.id

    console.log('🔍 [ENHANCED AI CONTROLLER] Análise de prompt solicitada:', {
      userId,
      promptLength: prompt?.length || 0,
      projectType: projectContext?.type
    })

    if (!prompt || !prompt.trim()) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Prompt é obrigatório',
        error: 'MISSING_PROMPT'
      })
    }

    try {
      const contextWithUser = {
        userId,
        projectName: 'Análise de Prompt',
        type: projectContext?.type || PROJECT_TYPES.CAMPAIGN,
        industry: projectContext?.industry || 'geral',
        tone: projectContext?.tone || 'profissional',
        status: 'ativo'
      }

      const analysis = await EnhancedAIService.analyzePrompt(
        prompt.trim(),
        contextWithUser,
        userHistory
      )

      console.log('✅ [ENHANCED AI CONTROLLER] Prompt analisado:', {
        userId,
        confidence: Math.round(analysis.confidence * 100) + '%',
        intentionsCount: analysis.intentions.length,
        hasVisualReqs: Object.keys(analysis.visualRequirements).length > 0,
        processingTime: analysis.processingTime
      })

      res.json({
        success: true,
        message: 'Prompt analisado com sucesso!',
        data: {
          analysis,
          insights: {
            complexity: analysis.intentions.length > 2 ? 'high' : analysis.intentions.length > 0 ? 'medium' : 'low',
            recommendedMode: analysis.confidence > 0.7 ? 'enhanced' : 'standard',
            suggestedImprovements: this.generatePromptSuggestions(analysis)
          }
        }
      })

    } catch (error: any) {
      console.error('❌ [ENHANCED AI CONTROLLER] Erro na análise:', error.message)
      
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro ao analisar prompt: ' + error.message,
        error: 'PROMPT_ANALYSIS_FAILED'
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
          available: true,
          features: [
            'smart-prompt-analysis',
            'visual-requirements-detection', 
            'intelligent-content-generation',
            'contextual-chat',
            'enhanced-templates',
            'intent-detection',
            'quality-scoring'
          ],
          version: '2.0.0-enhanced'
        },
        promptAnalyzer: {
          available: true,
          features: [
            'intention-detection',
            'visual-requirements-extraction',
            'content-analysis',
            'confidence-scoring',
            'smart-suggestions'
          ]
        },
        baseAI: {
          status: baseAIHealth.status,
          responseTime: baseAIHealth.responseTime,
          model: 'anthropic/claude-3-sonnet'
        },
        capabilities: {
          smartGeneration: true,
          intelligentChat: true,
          promptAnalysis: true,
          visualCustomization: true,
          contextualMemory: true
        },
        usage: {
          recommendEnhanced: baseAIHealth.status === 'available',
          fallbackToLegacy: false,
          betaFeatures: false
        }
      }

      console.log('✅ [ENHANCED AI CONTROLLER] Status compilado:', {
        userId,
        enhancedAvailable: true,
        analyzerAvailable: true,
        baseAIStatus: baseAIHealth.status
      })

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

    if (!prompt || !prompt.trim()) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Prompt é obrigatório para comparação',
        error: 'MISSING_PROMPT'
      })
    }

    try {
      const contextWithUser = {
        userId,
        projectName: 'Comparação de Modos',
        type: projectContext?.type || PROJECT_TYPES.CAMPAIGN,
        industry: projectContext?.industry || 'geral',
        tone: projectContext?.tone || 'profissional',
        status: 'ativo'
      }

      const startSmart = Date.now()
      const smartRequest: SmartEmailRequest = {
        prompt: prompt.trim(),
        projectContext: contextWithUser,
        useEnhanced: true
      }
      const smartResult = await EnhancedAIService.generateSmartEmail(smartRequest)
      const smartTime = Date.now() - startSmart

      const comparison = {
        standard: {
          result: {
            subject: 'Versão básica não disponível',
            previewText: 'Apenas versão inteligente ativa',
            html: '<p>Sistema migrado para IA inteligente apenas</p>',
            text: 'Sistema migrado para IA inteligente apenas'
          },
          processingTime: 0,
          features: [],
          qualityScore: 0,
          deprecated: true
        },
        smart: {
          result: {
            subject: smartResult.subject,
            previewText: smartResult.previewText,
            html: smartResult.html,
            text: smartResult.html.replace(/<[^>]*>/g, '')
          },
          analysis: smartResult.analysis,
          processingTime: smartTime,
          features: smartResult.metadata.enhancedFeatures,
          qualityScore: smartResult.metadata.qualityScore
        },
        recommendation: {
          useSmartMode: true,
          reason: 'Sistema otimizado - apenas IA inteligente disponível',
          confidenceDifference: smartResult.analysis.confidence
        }
      }

      console.log('✅ [ENHANCED AI CONTROLLER] Comparação concluída:', {
        userId,
        smartTime,
        smartConfidence: Math.round(smartResult.analysis.confidence * 100) + '%',
        recommendation: comparison.recommendation.useSmartMode
      })

      res.json({
        success: true,
        message: 'Sistema otimizado - usando apenas IA inteligente!',
        data: comparison
      })

    } catch (error: any) {
      console.error('❌ [ENHANCED AI CONTROLLER] Erro na comparação:', error.message)
      
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro ao comparar modos de IA: ' + error.message,
        error: 'COMPARISON_FAILED'
      })
    }
  })

  private generatePromptSuggestions(analysis: any): string[] {
    const suggestions: string[] = []

    if (analysis.confidence < 0.5) {
      suggestions.push('Seja mais específico sobre o que deseja')
    }

    if (analysis.intentions.length === 0) {
      suggestions.push('Mencione explicitamente o que quer criar ou modificar')
    }

    if (Object.keys(analysis.visualRequirements).length === 0) {
      suggestions.push('Inclua detalhes visuais como cores, layout ou estilo')
    }

    if (analysis.contentRequirements.focus.length <= 1) {
      suggestions.push('Especifique o objetivo do email (venda, informação, etc.)')
    }

    if (suggestions.length === 0) {
      suggestions.push('Prompt bem estruturado - nenhuma melhoria necessária')
    }

    return suggestions
  }

  healthCheck = asyncHandler(async (req: AuthRequest, res: Response) => {
    const health = {
      status: 'ok',
      timestamp: new Date(),
      service: 'enhanced-ai',
      version: '2.0.0-enhanced',
      features: {
        smartGeneration: true,
        promptAnalysis: true,
        intelligentChat: true,
        visualCustomization: true
      },
      environment: process.env.NODE_ENV || 'development'
    }

    res.json({
      success: true,
      data: health
    })
  })
}

export default new EnhancedAIController()
