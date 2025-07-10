import { Response } from 'express'
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

const generateEmailDirect = async (req: AuthRequest, res: Response): Promise<void> => {
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
      projectId,
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

      if (userId) {
        await consumeCreditsAfterSuccess(req)
      }

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Email gerado com sucesso (modo fallback)',
        data: {
          id: `fallback_${Date.now()}`,
          name: `Email ${industry} - ${new Date().toLocaleDateString('pt-BR')}`,
          ...fallbackResult,
          projectId
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
          urgency,
          projectId
        },
        userId
      }

      const startTime = Date.now()
      const iaResponse = await iaService.generateHTML(iaRequest)
      const processingTime = Date.now() - startTime

      const estimatedTokens = Math.ceil(iaResponse.html.length / 4)
      const estimatedCost = estimatedTokens * 0.000003

      if (userId) {
        await consumeCreditsAfterSuccess(req)
        
        await supabase.rpc('log_api_usage', {
          p_user_id: userId,
          p_endpoint: 'ai_generate_direct',
          p_tokens_used: estimatedTokens,
          p_cost: estimatedCost
        })
      }

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: (iaResponse.metadata.imagesAnalyzed ?? 0) > 0 
          ? `Email gerado com sucesso! ${iaResponse.metadata.imagesAnalyzed} imagem(ns) analisada(s) e integrada(s).`
          : 'Email gerado com sucesso via IA Service',
        data: {
          id: `ai_${Date.now()}`,
          name: `Email ${industry} - ${new Date().toLocaleDateString('pt-BR')}`,
          ...iaResponse,
          projectId
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
      
      if (userId) {
        await consumeCreditsAfterSuccess(req)
      }
      
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Email gerado com fallback devido a erro na IA',
        data: {
          id: `fallback_error_${Date.now()}`,
          name: `Email Fallback - ${new Date().toLocaleDateString('pt-BR')}`,
          ...fallbackResult,
          projectId
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
    logger.error('Erro na geração de email direto:', error.message)
    
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Erro na geração de email',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Serviço temporariamente indisponível'
    })
  }
}

const generateEmailAndSaveToProject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { projectId } = req.params
    const userId = req.user?.id

    if (!projectId || !userId) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Project ID é obrigatório'
      })
      return
    }

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single()

    if (projectError || !project) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: 'Projeto não encontrado'
      })
      return
    }

    req.body.projectId = projectId
    req.body.context = {
      ...req.body.context,
      projectName: project.name,
      existingContent: project.content
    }

    await generateEmailDirect(req, res)

    if (res.statusCode === 200) {
      const responseData = res.locals.responseData || {}
      if (responseData.success && responseData.data) {
        const { error: updateError } = await supabase
          .from('projects')
          .update({
            content: {
              html: responseData.data.html,
              subject: responseData.data.subject
            },
            metadata: {
              ...project.metadata,
              lastAIGeneration: new Date().toISOString(),
              aiPrompt: req.body.prompt
            },
            updated_at: new Date().toISOString()
          })
          .eq('id', projectId)
          .eq('user_id', userId)

        if (updateError) {
          logger.error('Erro ao atualizar projeto:', updateError)
        }
      }
    }

  } catch (error: any) {
    logger.error('Erro em generateEmailAndSaveToProject:', error.message)
    
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Erro ao gerar email e salvar no projeto',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Serviço temporariamente indisponível'
    })
  }
}

const DirectEmailController = {
  generateEmailDirect,
  generateEmailAndSaveToProject
}

export default DirectEmailController