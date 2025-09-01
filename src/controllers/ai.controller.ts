import { Request, Response } from 'express'
import { validationResult } from 'express-validator'
import { HTTP_STATUS } from '../utils/constants'
import { logger } from '../utils/logger'
import { supabase } from '../config/supabase.config'
import { AuthRequest } from '../types/auth.types'
import iaService from '../services/iaservice'
import { generateFallbackHTML, processImages } from '../utils/email-helpers'



const generateEmail = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Dados de entrada inválidos',
        errors: errors.array()
      })
      return
    }

    const { 
      prompt, 
      context = {}, 
      industry = 'geral', 
      tone = 'professional', 
      urgency = 'medium', 
      images = [],
      imageUrls = [] 
    } = req.body
    
    // ✅ CORRIGIDO: Garantir que userId não seja undefined
    const userId = req.user!.id

    if (!prompt?.trim()) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Prompt é obrigatório'
      })
      return
    }

    const processedImages = processImages(images.length > 0 ? images : imageUrls)
    const finalImageUrls = processedImages.imageUrls
    const imageIntents = processedImages.imageIntents

    const iaAvailable = iaService.isEnabled()
    
    if (!iaAvailable) {
      logger.info('IA Service unavailable, using HTML fallback')
      
      const fallbackResult = generateFallbackHTML(prompt)

      // ✅ CRÉDITOS SÃO CONSUMIDOS AUTOMATICAMENTE PELO MIDDLEWARE consumeAICredit

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'HTML gerado com sucesso (modo fallback)',
        data: {
          id: `fallback_${Date.now()}`,
          name: `Email ${industry} - ${new Date().toLocaleDateString('pt-BR')}`,
          ...fallbackResult
        },
        metadata: {
          service: 'mailtrendz-fallback-html',
          fallback_mode: true,
          processing_time: '< 100ms',
          system_type: 'html_direct',
          model: 'fallback'
        }
      })
      return
    }

    try {
      const iaRequest = {
        userInput: prompt,
        imageUrls: finalImageUrls,
        imageIntents: imageIntents,
        context: {
          ...context,
          userId,
          timestamp: new Date().toISOString(),
          industry,
          tone,
          urgency
        },
        userId
      }

      const startTime = Date.now()
      const iaResponse = await iaService.generateHTML(iaRequest)
      const processingTime = Date.now() - startTime

      const estimatedTokens = Math.ceil(iaResponse.html.length / 4)
      const estimatedCost = estimatedTokens * 0.000003

      // ✅ CRÉDITOS SÃO CONSUMIDOS AUTOMATICAMENTE PELO MIDDLEWARE consumeAICredit
      
      // ❌ REMOVIDO: Duplo logging - já é feito pelo middleware logAPIUsage
      // await supabase.rpc('log_api_usage', {
      //   p_user_id: userId,
      //   p_endpoint: 'ai_generate',
      //   p_tokens_used: estimatedTokens,
      //   p_cost: estimatedCost
      // })

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: (iaResponse.metadata.imagesAnalyzed ?? 0) > 0 
          ? `HTML gerado com sucesso! ${iaResponse.metadata.imagesAnalyzed} imagem(ns) analisada(s) e integrada(s).`
          : 'HTML gerado com sucesso via IA Service',
        data: {
          id: `ai_${Date.now()}`,
          name: `Email ${industry} - ${new Date().toLocaleDateString('pt-BR')}`,
          ...iaResponse
        },
        metadata: {
          ...iaResponse.metadata,
          proxy_processing_time: processingTime,
          system_type: 'html_direct',
          tokens_used: estimatedTokens,
          cost: estimatedCost
        }
      })

    } catch (iaError: any) {
      logger.error('Erro na IA Service, usando fallback:', iaError.message)
      
      const fallbackResult = generateFallbackHTML(prompt)
      
      // ✅ CRÉDITOS CONSUMIDOS AUTOMATICAMENTE PELO MIDDLEWARE
      
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'HTML gerado com fallback devido a erro na IA',
        data: {
          id: `fallback_error_${Date.now()}`,
          name: `Email Fallback - ${new Date().toLocaleDateString('pt-BR')}`,
          ...fallbackResult
        },
        metadata: {
          service: 'mailtrendz-fallback-html',
          fallback_mode: true,
          original_error: iaError.message,
          system_type: 'html_direct',
          model: 'fallback'
        }
      })
    }

  } catch (error: any) {
    logger.error('Erro na geração de HTML:', error.message)
    
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Erro na geração de HTML',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Serviço temporariamente indisponível'
    })
  }
}

const modifyEmail = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Dados de entrada inválidos',
        errors: errors.array()
      })
      return
    }

    const { 
      instructions, 
      html, 
      project_id, 
      images = [],
      imageUrls = [] 
    } = req.body

    const processedImages = processImages(images.length > 0 ? images : imageUrls)
    const finalImageUrls = processedImages.imageUrls
    const imageIntents = processedImages.imageIntents

    if (!iaService.isEnabled()) {
      const fallbackResult = generateFallbackHTML(instructions)
      
      // ✅ CRÉDITOS SÃO CONSUMIDOS AUTOMATICAMENTE PELO MIDDLEWARE consumeAICredit
      
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Email modificado com fallback',
        data: {
          ...fallbackResult
        },
        metadata: {
          service: 'mailtrendz-fallback-modification',
          fallback_mode: true
        }
      })
      return
    }

    try {
      const startTime = Date.now()
      const iaResponse = await iaService.modifyHTML(
        instructions, 
        html, 
        finalImageUrls,
        imageIntents
      )
      const processingTime = Date.now() - startTime

      const estimatedTokens = Math.ceil(iaResponse.html.length / 4)
      const estimatedCost = estimatedTokens * 0.000003

      // ✅ CRÉDITOS SÃO CONSUMIDOS AUTOMATICAMENTE PELO MIDDLEWARE consumeAICredit
      
      // Log de uso da API
      // ❌ REMOVIDO: Duplo logging - já é feito pelo middleware logAPIUsage

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: (iaResponse.metadata.imagesAnalyzed ?? 0) > 0
          ? `Email modificado com sucesso! ${iaResponse.metadata.imagesAnalyzed} imagem(ns) integrada(s).`
          : 'Email modificado com sucesso via IA Service',
        data: {
          ...iaResponse
        },
        metadata: {
          ...iaResponse.metadata,
          proxy_processing_time: processingTime,
          project_id,
          tokens_used: estimatedTokens,
          cost: estimatedCost
        }
      })

    } catch (iaError: any) {
      logger.error('Erro na modificação via IA, usando fallback:', iaError.message)
      
      const fallbackResult = generateFallbackHTML(instructions)
      
      // ✅ CRÉDITOS CONSUMIDOS AUTOMATICAMENTE PELO MIDDLEWARE
      
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Email modificado com fallback devido a erro',
        data: {
          ...fallbackResult
        },
        metadata: {
          service: 'mailtrendz-fallback-modification',
          fallback_mode: true,
          original_error: iaError.message
        }
      })
    }

  } catch (error: any) {
    logger.error('Erro na modificação de HTML:', error.message)
    
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Erro na modificação de email',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Serviço temporariamente indisponível'
    })
  }
}

const validateEmail = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { html } = req.body

    if (!html || typeof html !== 'string') {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'HTML é obrigatório para validação'
      })
      return
    }

    const validation: {
      valid: boolean
      issues: string[]
      suggestions: string[]
      score: number
    } = {
      valid: true,
      issues: [],
      suggestions: [
        'HTML estruturado corretamente',
        'Considere adicionar meta tags para melhor compatibilidade',
        'Teste em diferentes clientes de email'
      ],
      score: 85
    }

    if (!html.includes('<!DOCTYPE')) {
      validation.issues.push('HTML sem DOCTYPE declarado')
      validation.score -= 10
    }

    if (!html.includes('<meta charset')) {
      validation.issues.push('Charset não especificado')
      validation.score -= 5
    }

    if (html.includes('javascript:') || html.includes('<script')) {
      validation.issues.push('JavaScript detectado - pode ser bloqueado por clientes de email')
      validation.score -= 20
    }

    if (!html.includes('font-size')) {
      validation.suggestions.push('Considere especificar tamanhos de fonte para melhor consistência')
    }

    if (validation.issues.length > 0) {
      validation.valid = false
    }

    if (validation.score > 80) {
      validation.suggestions.push('HTML bem estruturado para emails!')
    }

    // Validação não consome créditos
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'HTML validado com sucesso',
      data: validation
    })

  } catch (error: any) {
    logger.error('Erro na validação HTML:', error.message)
    
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Erro na validação HTML',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Serviço temporariamente indisponível'
    })
  }
}

const processChat = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id
    const { 
      message, 
      chat_id, 
      project_id,
      html,
      operation,
      images = [],
      imageUrls = [] 
    } = req.body

    const processedImages = processImages(images.length > 0 ? images : imageUrls)
    const finalImageUrls = processedImages.imageUrls
    const imageIntents = processedImages.imageIntents

    if (!iaService.isEnabled()) {
      res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({
        success: false,
        message: 'Funcionalidade de chat requer IA Service configurada'
      })
      return
    }

    try {
      // 🚀 SOLUÇÃO DEFINITIVA: VALIDAÇÃO E CONTEXTO ROBUSTO
      const HTMLResolver = require('../utils/html-resolver').default
      
      // ✅ PRIORIZAR HTML DO FRONTEND (mais confiável e atualizado)
      let existingHTML = html
      let htmlSource = 'none'
      
      if (html && html.trim().length > 0) {
        htmlSource = 'frontend'
        logger.info('🎯 [SOLUÇÃO-DEFINITIVA] HTML recebido do frontend', {
          htmlLength: html.length,
          chatId: chat_id,
          projectId: project_id,
          source: htmlSource
        })
      } else {
        // Fallback: buscar via HTMLResolver apenas se não veio do frontend
        existingHTML = await HTMLResolver.getCurrentHTML(project_id, chat_id)
        if (existingHTML) {
          htmlSource = 'backend-resolver'
          logger.info('🔄 [SOLUÇÃO-DEFINITIVA] HTML obtido via HTMLResolver (fallback)', {
            htmlLength: existingHTML.length,
            chatId: chat_id,
            projectId: project_id,
            source: htmlSource
          })
        } else {
          logger.info('⚠️ [SOLUÇÃO-DEFINITIVA] Nenhum HTML encontrado - será criação nova', {
            chatId: chat_id,
            projectId: project_id,
            source: htmlSource
          })
        }
      }
      
      // ✅ DETERMINAR OPERAÇÃO ROBUSTA
      const hasExistingHTML = !!(existingHTML && existingHTML.trim().length > 0)
      let finalOperation = operation || HTMLResolver.determineOperation(message, hasExistingHTML)
      
      // 🚀 VALIDAÇÃO CRÍTICA: Alertar se há discrepância
      if (hasExistingHTML && finalOperation === 'create') {
        logger.warn('🚨 [SOLUÇÃO-DEFINITIVA] ALERTA: HTML encontrado mas operação é CREATE', {
          hasHTML: hasExistingHTML,
          htmlLength: existingHTML?.length,
          operation: finalOperation,
          htmlSource,
          message: message.substring(0, 100)
        })
        // Forçar operação EDIT se há HTML
        finalOperation = 'edit'
      }
      
      logger.info('📋 [SOLUÇÃO-DEFINITIVA] CONTEXTO PROCESSADO', { 
        chatId: chat_id,
        projectId: project_id,
        hasExistingHTML,
        htmlLength: existingHTML?.length || 0,
        htmlSource,
        inputOperation: operation,
        finalOperation,
        messageLength: message.length,
        messagePreview: message.substring(0, 100),
        contextPreserved: hasExistingHTML && finalOperation === 'edit'
      })

      const iaResponse = await iaService.generateHTML({
        userInput: message,
        imageUrls: finalImageUrls,
        imageIntents: imageIntents,
        operation: finalOperation, // ✅ CRÍTICO: Operação correta passada para IA
        context: {
          chat_id,
          project_id,
          isChat: true,
          existingHTML,
          operation: finalOperation,
          isModification: finalOperation !== 'create',
          htmlSource // ✅ INFO: Origem do HTML para debugging
        },
        userId
      })

      const estimatedTokens = Math.ceil(message.length / 4)
      const estimatedCost = estimatedTokens * 0.000003

      // ✅ CRÉDITOS SÃO CONSUMIDOS AUTOMATICAMENTE PELO MIDDLEWARE consumeAICredit
      
      // ✅ SALVAR MENSAGENS NO BANCO
      if (chat_id) {
        try {
          // 🔧 CORREÇÃO: Usar supabaseAdmin com type assertion para contornar limitações TypeScript
          const supabaseAdmin = require('../config/supabase.config').supabaseAdmin
          
          // Salvar mensagem do usuário
          await (supabaseAdmin as any)
            .from('messages')
            .insert({
              chat_id: chat_id,
              role: 'user',
              content: message,
              artifacts: {
                images: finalImageUrls?.length || 0,
                imageIntents: imageIntents?.map(i => i.intent) || []
              }
            })

          // 🔧 CORREÇÃO: Salvar resposta da IA com artifacts HTML padronizado
          await (supabaseAdmin as any)
            .from('messages')
            .insert({
              chat_id: chat_id,
              role: 'assistant',
              content: iaResponse.response,
              artifacts: iaResponse.html ? {
                id: Date.now().toString(),
                type: 'html', // 🔧 USAR 'html' EM VEZ DE 'text'
                title: 'Email HTML Gerado',
                content: iaResponse.html
              } : {
                ...iaResponse.metadata,
                hasHtml: !!iaResponse.html,
                htmlLength: iaResponse.html?.length || 0
              }
            })

          logger.info('Mensagens salvas no banco com sucesso', { chat_id, project_id })
        } catch (saveError) {
          logger.error('Erro ao salvar mensagens:', saveError)
        }
      }

      // ✅ SALVAR HTML USANDO HTML-RESOLVER
      if (project_id && iaResponse.html) {
        try {
          await HTMLResolver.saveProjectHTML(project_id, iaResponse.html, iaResponse.subject)
        } catch (updateError) {
          logger.error('[AI-CONTROLLER] Erro ao salvar HTML via HTMLResolver:', updateError)
        }
      }

      // Log de uso da API
      await supabase.rpc('log_api_usage', {
        p_user_id: userId,
        p_endpoint: 'ai_chat',
        p_tokens_used: estimatedTokens,
        p_cost: estimatedCost
      })

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: (iaResponse.metadata.imagesAnalyzed ?? 0) > 0
          ? `Chat processado com sucesso! ${iaResponse.metadata.imagesAnalyzed} imagem(ns) analisada(s).`
          : 'Chat processado com sucesso',
        data: {
          response: iaResponse.response,
          html: iaResponse.html, // ✅ GARANTIR QUE HTML ESTÁ NA RESPOSTA
          aiResponse: {
            html: iaResponse.html
          },
          suggestions: [
            (iaResponse.metadata.imagesAnalyzed ?? 0) > 0 
              ? `${iaResponse.metadata.imagesAnalyzed} imagem(ns) integrada(s) ao email`
              : 'HTML gerado via chat',
            'Você pode pedir modificações específicas',
            'Use comandos como "mude a cor para azul" ou "adicione um botão"'
          ]
        },
        metadata: {
          ...iaResponse.metadata,
          chat_id,
          project_id,
          tokens_used: estimatedTokens,
          cost: estimatedCost
        }
      })

    } catch (iaError: any) {
      logger.error('Erro no chat via IA:', iaError.message)
      
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Chat processado com limitações',
        data: {
          response: 'Desculpe, não consegui processar sua solicitação no momento. Tente reformular sua pergunta ou use o editor manual.',
          suggestions: [
            'Tente ser mais específico na sua solicitação',
            'Use o editor manual como alternativa',
            'Verifique se a IA Service está configurada corretamente'
          ]
        },
        metadata: {
          service: 'mailtrendz-chat-fallback',
          error: iaError.message
        }
      })
    }

  } catch (error: any) {
    logger.error('Erro no processamento de chat:', error.message)
    
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Erro no processamento de chat',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Serviço temporariamente indisponível'
    })
  }
}

export const getHealthStatus = async (_req: Request, res: Response): Promise<void> => {
  try {
    const nodeHealth = {
      status: 'healthy',
      service: 'mailtrendz-nodejs-backend-ia',
      database: 'supabase',
      uptime: Math.round(process.uptime()),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
      }
    }

    let iaHealth = null
    let iaAvailable = false

    if (iaService.isEnabled()) {
      try {
        iaAvailable = await iaService.healthCheck()
        iaHealth = {
          status: iaAvailable ? 'healthy' : 'degraded',
          model: iaService.getModel(),
          enabled: true,
          features: ['image-analysis-urls', 'html-generation', 'email-modification']
        }
      } catch (error: any) {
        iaHealth = {
          status: 'unhealthy',
          error: error.message,
          enabled: true
        }
      }
    } else {
      iaHealth = {
        status: 'disabled',
        message: 'IA Service not configured (OPENROUTER_API_KEY missing)',
        enabled: false
      }
    }

    const overallStatus = iaService.isEnabled() ? (iaAvailable ? 'healthy' : 'degraded') : 'healthy'

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Health Check - MailTrendz Backend IA',
      data: {
        overall_status: overallStatus,
        services: {
          nodejs_backend: nodeHealth,
          ia_service: iaHealth
        },
        ia_enabled: iaService.isEnabled(),
        ia_available: iaAvailable,
        system_type: 'html_direct_ia_with_images',
        version: '4.0.0-ia-integrated-images-stripe'
      },
      metadata: {
        timestamp: new Date().toISOString(),
        version: '4.0.0-ia-integrated-images-stripe'
      }
    })

  } catch (error: any) {
    logger.error('Health check error:', error.message)
    
    res.status(HTTP_STATUS.OK).json({
      success: false,
      message: 'Health check com problemas',
      data: {
        overall_status: 'unhealthy',
        error: error.message
      }
    })
  }
}

export const testConnection = async (_req: Request, res: Response): Promise<void> => {
  try {
    if (!iaService.isEnabled()) {
      res.status(HTTP_STATUS.OK).json({
        success: false,
        message: 'IA Service disabled - OPENROUTER_API_KEY not configured',
        data: {
          connected: false,
          enabled: false,
          model: iaService.getModel()
        }
      })
      return
    }

    const startTime = Date.now()
    const tests = []
    
    try {
      const healthTest = await iaService.healthCheck()
      tests.push({
        endpoint: 'health_check',
        success: healthTest,
        response: healthTest ? 'IA Service OK' : 'IA Service degraded'
      })
    } catch (error: any) {
      tests.push({
        endpoint: 'health_check',
        success: false,
        error: error.message
      })
    }
    
    try {
      const testGeneration = await iaService.generateHTML({
        userInput: 'teste de conexão com análise de imagens',
        imageUrls: ['https://example.com/test-image.jpg']
      })
      tests.push({
        endpoint: 'test_generation_with_images',
        success: true,
        response: 'Geração com imagens OK',
        html_length: testGeneration.html.length,
        images_processed: testGeneration.metadata.imagesAnalyzed
      })
    } catch (error: any) {
      tests.push({
        endpoint: 'test_generation_with_images',
        success: false,
        error: error.message
      })
    }
    
    const responseTime = Date.now() - startTime
    const isConnected = tests.filter(t => t.success).length > 0

    res.status(HTTP_STATUS.OK).json({
      success: isConnected,
      message: isConnected ? 'IA Connection OK with Image Support' : 'IA Connection failed',
      data: {
        connected: isConnected,
        enabled: true,
        responseTime,
        tests,
        model: iaService.getModel(),
        system_type: 'html_direct_ia_with_images',
        features: ['image-url-analysis', 'html-generation', 'css-inline']
      }
    })

  } catch (error: any) {
    logger.error('IA connection test error:', error.message)
    
    res.status(HTTP_STATUS.OK).json({
      success: false,
      message: 'IA connection test error',
      error: error.message,
      data: {
        connected: false,
        enabled: true,
        model: iaService.getModel(),
        system_type: 'html_direct_ia_with_images'
      }
    })
  }
}

// 🗑️ REMOVIDO: Usar ChatController.getLatestHTMLFromMessagesOptimized() em vez de função duplicada

// 🗑️ REMOVIDO: Função duplicada - usar ChatController.getLatestHTMLFromMessagesOptimized()

const AIController = {
  generateEmail,
  modifyEmail,
  validateEmail,
  processChat,
  getHealthStatus,
  testConnection
}

export default AIController