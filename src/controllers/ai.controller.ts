import { Request, Response } from 'express'
import { validationResult } from 'express-validator'
import { HTTP_STATUS } from '../utils/constants'
import { logger } from '../utils/logger'
import { supabase } from '../config/supabase.config'
import { AuthRequest } from '../types/auth.types'
import { consumeCreditsAfterSuccess } from '../middleware/auth.middleware'
import iaService from '../services/iaservice'

const generateFallbackHTML = (prompt: string) => {
  logger.info('🧪 [FALLBACK] Gerando HTML de exemplo para prompt:', prompt.substring(0, 50))
  
  const promptLower = prompt.toLowerCase()
  let html = ''
  let subject = 'Email Personalizado'
  let emailType = 'generic'
  
  if (promptLower.includes('promocional') || promptLower.includes('produto') || 
      promptLower.includes('emagrecimento') || promptLower.includes('oferta')) {
    emailType = 'promotional'
    subject = 'Oferta Especial - Produto de Emagrecimento'
    html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${subject}</title>
    <style>
        body { margin: 0; padding: 0; background-color: #f5f5f5; font-family: Arial, sans-serif; font-size: 18px; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { background: linear-gradient(135deg, #fef3c7 0%, #f59e0b 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }
        .header h1 { color: #dc2626; font-size: 32px; margin: 0; font-weight: bold; }
        .content { padding: 40px 30px; }
        .highlight { background: #d1fae5; padding: 15px; border-radius: 8px; text-align: center; font-size: 24px; color: #059669; font-weight: bold; margin: 20px 0; }
        .cta { text-align: center; margin: 30px 0; }
        .btn { background: #dc2626; color: white; padding: 16px 32px; border-radius: 25px; text-decoration: none; font-weight: bold; font-size: 18px; display: inline-block; box-shadow: 0 6px 20px rgba(220, 38, 38, 0.4); }
        .guarantee { text-align: center; font-size: 14px; color: #6b7280; line-height: 1.8; margin: 20px 0; }
        .footer { background: #6b7280; color: white; padding: 15px; text-align: center; font-size: 12px; }
        p { font-size: 18px; margin-bottom: 15px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔥 Transforme Seu Corpo em 30 Dias!</h1>
        </div>
        <div class="content">
            <p style="font-size: 18px; text-align: center; color: #374151; line-height: 1.6; margin-bottom: 25px;">
                O produto de emagrecimento que está revolucionando vidas! Acelera o metabolismo, reduz a fome e queima gordura localizada de forma natural.
            </p>
            
            <div class="highlight">
                De R$ 197,00 por apenas<br>
                <span style="font-size: 28px;">R$ 97,00</span>
            </div>
            
            <div class="cta">
                <a href="#" class="btn">🛒 Comprar Agora</a>
            </div>
            
            <div class="guarantee">
                ✅ Garantia de 30 dias<br>
                🚚 Frete grátis para todo Brasil<br>
                🔒 Pagamento 100% seguro
            </div>
        </div>
        <div class="footer">
            <p style="margin: 0;">© 2025 MailTrendz - Sistema Simplificado</p>
        </div>
    </div>
</body>
</html>`
  } else if (promptLower.includes('newsletter') || promptLower.includes('novidades') || 
             promptLower.includes('semanal')) {
    emailType = 'newsletter'
    subject = 'Newsletter Semanal'
    html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${subject}</title>
    <style>
        body { margin: 0; padding: 0; background-color: #f5f5f5; font-family: Arial, sans-serif; font-size: 18px; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { background: #f3f4f6; padding: 25px; text-align: center; border-radius: 8px; margin-bottom: 25px; }
        .content { padding: 40px 30px; }
        .highlight { background: #eff6ff; padding: 20px; border-radius: 8px; border-left: 4px solid #3b82f6; margin: 20px 0; }
        .cta { text-align: center; margin: 20px 0; }
        .btn { background: #3b82f6; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block; }
        .footer { background: #6b7280; color: white; padding: 15px; text-align: center; font-size: 12px; }
        p { font-size: 18px; margin-bottom: 15px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="content">
            <div class="header">
                <h1 style="color: #1f2937; font-size: 28px; margin: 0;">📧 Newsletter Semanal</h1>
            </div>
            
            <p style="font-size: 16px; color: #374151; line-height: 1.6;">
                Olá! Esta é nossa newsletter com as principais novidades e destaques da semana para você ficar por dentro de tudo.
            </p>
            
            <div class="highlight">
                <h3 style="color: #1f2937; margin-top: 0;">🚀 Destaque da Semana</h3>
                <p style="color: #374151; margin-bottom: 0;">
                    Lançamos uma nova funcionalidade incrível que vai revolucionar sua experiência. Confira todos os detalhes!
                </p>
            </div>
            
            <div class="cta">
                <a href="#" class="btn">Ver Novidades</a>
            </div>
        </div>
        <div class="footer">
            <p style="margin: 0;">© 2025 MailTrendz - Newsletter</p>
        </div>
    </div>
</body>
</html>`
  } else {
    emailType = 'generic'
    subject = 'Email Personalizado'
    html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${subject}</title>
    <style>
        body { margin: 0; padding: 0; background-color: #f5f5f5; font-family: Arial, sans-serif; font-size: 18px; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%); padding: 25px; text-align: center; border-radius: 12px; margin-bottom: 25px; }
        .content { padding: 40px 30px; }
        .cta { text-align: center; margin: 20px 0; }
        .btn { background: #6366f1; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block; }
        .footer { background: #6b7280; color: white; padding: 15px; text-align: center; font-size: 12px; }
        p { font-size: 18px; margin-bottom: 15px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="content">
            <div class="header">
                <h1 style="color: #7c3aed; font-size: 28px; margin: 0;">✨ Email Personalizado</h1>
            </div>
            
            <p style="font-size: 16px; color: #374151; line-height: 1.6;">
                Email baseado em: "<strong>${prompt}</strong>"
            </p>
            
            <p style="font-size: 16px; color: #374151; line-height: 1.6;">
                Este email foi gerado automaticamente com HTML limpo e responsivo. Você pode editá-lo completamente no editor de código ou pedir modificações via chat.
            </p>
            
            <div class="cta">
                <a href="#" class="btn">Saiba Mais</a>
            </div>
        </div>
        <div class="footer">
            <p style="margin: 0;">© 2025 MailTrendz - Editor Simplificado</p>
        </div>
    </div>
</body>
</html>`
  }

  return {
    html,
    subject,
    response: `HTML gerado com sucesso! Você pode editá-lo diretamente no editor ou pedir modificações aqui.`,
    metadata: {
      emailType,
      generatedAt: new Date().toISOString(),
      originalPrompt: prompt,
      isGenerated: true,
      isFallback: true,
      service: 'mailtrendz-fallback-html'
    }
  }
}

const processImages = (images: any[]) => {
  const imageUrls: string[] = []
  const imageIntents: Array<{ url: string; intent: 'analyze' | 'include' }> = []
  
  if (Array.isArray(images)) {
    images.forEach(image => {
      if (typeof image === 'string') {
        imageUrls.push(image)
        imageIntents.push({ url: image, intent: 'include' })
      } else if (image && typeof image === 'object') {
        if (image.uploadUrl) {
          imageUrls.push(image.uploadUrl)
          imageIntents.push({ 
            url: image.uploadUrl, 
            intent: image.intent || 'include' 
          })
        } else if (image.url) {
          imageUrls.push(image.url)
          imageIntents.push({ 
            url: image.url, 
            intent: image.intent || 'include' 
          })
        }
      }
    })
  }
  
  return { imageUrls, imageIntents }
}

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
    
    const userId = req.user?.id

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

      // ✅ CONSUMIR CRÉDITOS APÓS SUCESSO
      if (userId) {
        await consumeCreditsAfterSuccess(req)
      }

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

      // ✅ CONSUMIR CRÉDITOS APÓS SUCESSO
      if (userId) {
        await consumeCreditsAfterSuccess(req)
        
        // Log de uso da API
        await supabase.rpc('log_api_usage', {
          p_user_id: userId,
          p_endpoint: 'ai_generate',
          p_tokens_used: estimatedTokens,
          p_cost: estimatedCost
        })
      }

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
      
      // ✅ CONSUMIR CRÉDITOS APÓS SUCESSO (mesmo com fallback)
      if (userId) {
        await consumeCreditsAfterSuccess(req)
      }
      
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

    const userId = req.user?.id
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
      
      // ✅ CONSUMIR CRÉDITOS APÓS SUCESSO
      if (userId) {
        await consumeCreditsAfterSuccess(req)
      }
      
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

      // ✅ CONSUMIR CRÉDITOS APÓS SUCESSO
      if (userId) {
        await consumeCreditsAfterSuccess(req)
        
        // Log de uso da API
        await supabase.rpc('log_api_usage', {
          p_user_id: userId,
          p_endpoint: 'ai_modify',
          p_tokens_used: estimatedTokens,
          p_cost: estimatedCost
        })
      }

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
      
      // ✅ CONSUMIR CRÉDITOS APÓS SUCESSO (mesmo com fallback)
      if (userId) {
        await consumeCreditsAfterSuccess(req)
      }
      
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
    const userId = req.user?.id
    const { 
      message, 
      chat_id, 
      project_id, 
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
      const iaResponse = await iaService.generateHTML({
        userInput: message,
        imageUrls: finalImageUrls,
        imageIntents: imageIntents,
        context: {
          chat_id,
          project_id,
          isChat: true
        },
        userId
      })

      const estimatedTokens = Math.ceil(message.length / 4)
      const estimatedCost = estimatedTokens * 0.000003

      // ✅ CONSUMIR CRÉDITOS APÓS SUCESSO
      if (userId) {
        await consumeCreditsAfterSuccess(req)
        
        // Log de uso da API
        await supabase.rpc('log_api_usage', {
          p_user_id: userId,
          p_endpoint: 'ai_chat',
          p_tokens_used: estimatedTokens,
          p_cost: estimatedCost
        })
      }

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: (iaResponse.metadata.imagesAnalyzed ?? 0) > 0
          ? `Chat processado com sucesso! ${iaResponse.metadata.imagesAnalyzed} imagem(ns) analisada(s).`
          : 'Chat processado com sucesso',
        data: {
          response: iaResponse.response,
          html: iaResponse.html,
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

const AIController = {
  generateEmail,
  modifyEmail,
  validateEmail,
  processChat,
  getHealthStatus,
  testConnection
}

export default AIController