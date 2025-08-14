import { Response } from 'express'
import { validationResult } from 'express-validator'
import { HTTP_STATUS } from '../utils/constants'
import { logger } from '../utils/logger'
import { supabase } from '../config/supabase.config'
import { AuthRequest } from '../types/auth.types'
import { consumeCreditsAfterSuccess } from '../middleware/auth.middleware'
import iaService from '../services/iaservice'
import { generateFallbackHTML, processImages } from '../utils/email-helpers'



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

      await consumeCreditsAfterSuccess(req)

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

      await consumeCreditsAfterSuccess(req)
      
      // ❌ REMOVIDO: Duplo logging - já é feito pelo middleware logAPIUsage

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
      
      await consumeCreditsAfterSuccess(req)
      
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
    // ✅ CORRIGIDO: Garantir que userId não seja undefined
    const userId = req.user!.id

    if (!projectId) {
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
        // ✅ CORRIGIDO: Verificar se metadata existe e é um objeto antes do spread
        const existingMetadata = project.metadata && typeof project.metadata === 'object' && !Array.isArray(project.metadata) 
          ? project.metadata as Record<string, any>
          : {}

        const { error: updateError } = await supabase
          .from('projects')
          .update({
            content: {
              html: responseData.data.html,
              subject: responseData.data.subject
            },
            metadata: {
              ...existingMetadata,
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