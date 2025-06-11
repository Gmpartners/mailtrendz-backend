import { ProjectContext } from '../../../types/ai.types'
import { PromptAnalysis, Intention, VisualRequirements, ContentRequirements, UserHistory } from '../../../types/enhanced-ai.types'
import { logger } from '../../../utils/logger'

// ===============================================
// ANALISADOR DE PROMPTS INTELIGENTE - MailTrendz - SIMPLIFICADO PARA DEPLOY
// ===============================================

export class SmartPromptAnalyzer {
  private intentionPatterns: Map<string, RegExp[]>
  private visualKeywords: Map<string, string[]>
  private colorMappings: Map<string, string>
  private industryDefaults: Map<string, any>

  constructor() {
    this.initializePatterns()
    this.initializeColorMappings()
    this.initializeIndustryDefaults()
  }

  async analyzePrompt(
    prompt: string, 
    context: ProjectContext,
    userHistory?: UserHistory
  ): Promise<PromptAnalysis> {
    const startTime = Date.now()
    
    try {
      // Análise simplificada para deploy
      return {
        intentions: [{
          action: 'create',
          target: 'content',
          specification: 'Análise simplificada',
          priority: 0.8,
          scope: 'global',
          confidence: 0.7
        }],
        visualRequirements: {
          colorScheme: { primary: '#3b82f6', style: 'professional' },
          layout: { type: 'single-column', alignment: 'center' },
          typography: { style: 'modern', size: 'medium' }
        },
        contentRequirements: {
          tone: 'professional' as any,
          length: 'medium',
          focus: ['information'],
          urgency: 'low',
          personalization: 'none'
        },
        confidence: 0.7,
        processingTime: Date.now() - startTime,
        originalPrompt: prompt
      }

    } catch (error) {
      console.error('❌ [SMART ANALYZER] Erro na análise:', error)
      return this.getFallbackAnalysis(prompt, context, Date.now() - startTime)
    }
  }

  private initializePatterns() {
    this.intentionPatterns = new Map([
      ['create', [/criar|gerar|fazer/gi]],
      ['modify', [/alterar|mudar|modificar/gi]]
    ])
    this.visualKeywords = new Map([
      ['modern', ['moderno', 'contemporâneo']],
      ['professional', ['profissional', 'corporativo']]
    ])
  }

  private initializeColorMappings() {
    this.colorMappings = new Map([
      ['azul', '#3b82f6'],
      ['vermelho', '#ef4444'],
      ['verde', '#10b981']
    ])
  }

  private initializeIndustryDefaults() {
    this.industryDefaults = new Map([
      ['tecnologia', {
        colors: { primary: '#3b82f6', secondary: '#64748b' },
        style: 'modern',
        tone: 'professional'
      }]
    ])
  }

  private getFallbackAnalysis(prompt: string, context: ProjectContext, processingTime: number): PromptAnalysis {
    return {
      intentions: [{
        action: 'create',
        target: 'content',
        specification: 'Análise básica',
        priority: 0.5,
        scope: 'global',
        confidence: 0.3
      }],
      visualRequirements: {},
      contentRequirements: {
        tone: 'professional' as any,
        length: 'medium',
        focus: ['information'],
        urgency: 'low',
        personalization: 'none'
      },
      confidence: 0.3,
      processingTime,
      originalPrompt: prompt
    }
  }
}
