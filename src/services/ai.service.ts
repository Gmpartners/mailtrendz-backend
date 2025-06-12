import EnhancedAIService from './ai/enhanced/EnhancedAIService'

class AIService {
  async healthCheck() {
    try {
      return {
        status: 'ok',
        timestamp: new Date(),
        service: 'ai',
        enhanced: true
      }
    } catch (error) {
      return {
        status: 'error',
        timestamp: new Date(),
        service: 'ai',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async generateEmail(prompt: string, context: any) {
    try {
      console.log('🎯 [AI SERVICE] Gerando email com contexto melhorado...')
      
      // Enriquecer contexto com informações do projeto
      const enrichedContext = {
        ...context,
        projectContext: {
          projectName: context.projectName || 'Email Projeto',
          type: context.type || 'campaign',
          industry: context.industry || 'geral',
          targetAudience: context.targetAudience || 'Geral',
          tone: context.tone || 'profissional',
          status: context.status || 'draft'
        },
        userHistory: {
          previousProjects: [],
          preferredStyles: []
        },
        useEnhanced: true
      }

      const smartRequest = {
        prompt: prompt.trim(),
        projectContext: enrichedContext.projectContext,
        userHistory: enrichedContext.userHistory,
        useEnhanced: true
      }

      console.log('🤖 [AI SERVICE] Usando Enhanced AI Service...')
      const enhancedContent = await EnhancedAIService.generateSmartEmail(smartRequest)

      // Validar se o HTML está bem formado
      const validatedHTML = this.validateAndFixHTML(enhancedContent.html)

      return {
        subject: enhancedContent.subject || this.generateFallbackSubject(prompt),
        previewText: enhancedContent.previewText || this.generateFallbackPreview(enhancedContent.subject || prompt),
        html: validatedHTML,
        text: enhancedContent.html?.replace(/<[^>]*>/g, '') || this.generateFallbackText(prompt)
      }
    } catch (error) {
      console.error('❌ [AI SERVICE] Enhanced AI falhou, usando sistema melhorado de fallback:', error)
      
      // Sistema de fallback melhorado
      return this.generateFallbackEmailImproved(prompt, context)
    }
  }

  async improveEmail(content: any, feedback: string, context: any) {
    try {
      console.log('🔧 [AI SERVICE] Melhorando email com contexto do projeto...')
      
      // Preparar contexto com o conteúdo atual do email
      const chatHistory = [{
        role: 'system',
        content: `Email atual:
Assunto: ${content.subject || 'Sem assunto'}
HTML: ${content.html || 'Sem conteúdo'}`
      }]

      const enhancedResponse = await EnhancedAIService.smartChatWithAI(
        `Melhore este email com base no feedback: ${feedback}`,
        chatHistory,
        context
      )

      if (enhancedResponse.enhancedContent) {
        return {
          subject: enhancedResponse.enhancedContent.subject || content.subject,
          previewText: enhancedResponse.enhancedContent.previewText || content.previewText,
          html: this.validateAndFixHTML(enhancedResponse.enhancedContent.html || content.html),
          text: enhancedResponse.enhancedContent.html?.replace(/<[^>]*>/g, '') || content.text
        }
      }

      return content
    } catch (error) {
      console.error('❌ [AI SERVICE] Erro ao melhorar email, retornando original:', error)
      return content
    }
  }

  async smartChat(message: string, history: any[], context: any) {
    try {
      return await EnhancedAIService.smartChatWithAI(message, history, context)
    } catch (error) {
      console.error('❌ [AI SERVICE] Erro no chat inteligente:', error)
      throw error
    }
  }

  // ✅ NOVO: Validação e correção de HTML
  private validateAndFixHTML(html: string): string {
    if (!html || typeof html !== 'string') {
      return this.getBasicHTMLTemplate('Conteúdo não disponível')
    }

    try {
      // Remover caracteres de controle problemáticos
      let cleanHTML = html.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      
      // Garantir que tem DOCTYPE
      if (!cleanHTML.includes('<!DOCTYPE')) {
        cleanHTML = `<!DOCTYPE html>\n${cleanHTML}`
      }

      // Garantir estrutura básica HTML
      if (!cleanHTML.includes('<html')) {
        cleanHTML = `<html lang="pt-br">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<title>Email</title>\n</head>\n<body>\n${cleanHTML}\n</body>\n</html>`
      }

      // Corrigir tags não fechadas comuns
      const tagFixes = [
        { open: /<img([^>]*)(?<!\/)\s*>/gi, close: '<img$1 />' },
        { open: /<br(?!\s*\/?\s*>)/gi, close: '<br />' },
        { open: /<hr(?!\s*\/?\s*>)/gi, close: '<hr />' },
        { open: /<input([^>]*)(?<!\/)\s*>/gi, close: '<input$1 />' }
      ]

      tagFixes.forEach(fix => {
        cleanHTML = cleanHTML.replace(fix.open, fix.close)
      })

      // Garantir que tabelas tenham estrutura correta
      cleanHTML = cleanHTML.replace(/<table(?![^>]*border)/gi, '<table border="0" cellpadding="0" cellspacing="0"')
      
      // Validação final - se ainda está mal formado, usar template
      if (!this.isValidHTML(cleanHTML)) {
        console.warn('⚠️ [AI SERVICE] HTML ainda inválido após correções, usando template')
        return this.extractContentForTemplate(cleanHTML)
      }

      return cleanHTML
    } catch (error) {
      console.error('❌ [AI SERVICE] Erro na validação HTML:', error)
      return this.extractContentForTemplate(html)
    }
  }

  // ✅ NOVO: Verificação básica de HTML válido
  private isValidHTML(html: string): boolean {
    try {
      // Verificações básicas
      const hasOpeningTags = /<[^\/][^>]*>/g.test(html)
      const hasClosingTags = /<\/[^>]+>/g.test(html)
      
      if (!hasOpeningTags) return false
      
      // Verificar se tags principais estão balanceadas
      const criticalTags = ['table', 'tr', 'td', 'div', 'p']
      
      for (const tag of criticalTags) {
        const openCount = (html.match(new RegExp(`<${tag}[^>]*>`, 'gi')) || []).length
        const closeCount = (html.match(new RegExp(`</${tag}>`, 'gi')) || []).length
        
        if (openCount > 0 && Math.abs(openCount - closeCount) > 2) {
          console.warn(`⚠️ [AI SERVICE] Tag ${tag} desbalanceada: ${openCount} aberturas, ${closeCount} fechamentos`)
          return false
        }
      }
      
      return true
    } catch (error) {
      return false
    }
  }

  // ✅ NOVO: Extrair conteúdo e usar template válido
  private extractContentForTemplate(html: string): string {
    try {
      // Extrair título/assunto
      const titleMatch = html.match(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/i)
      const title = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, '') : 'Email Gerado'

      // Extrair conteúdo principal
      const bodyMatch = html.match(/<body[^>]*>(.*?)<\/body>/is) || 
                       html.match(/<div[^>]*class[^>]*container[^>]*>(.*?)<\/div>/is) ||
                       html.match(/<td[^>]*>(.*?)<\/td>/is)
      
      let content = bodyMatch ? bodyMatch[1] : html.replace(/<[^>]*>/g, '')
      
      // Limpar e formatar conteúdo
      content = content
        .replace(/<script[^>]*>.*?<\/script>/gis, '')
        .replace(/<style[^>]*>.*?<\/style>/gis, '')
        .replace(/\s+/g, ' ')
        .trim()

      if (content.length < 10) {
        content = 'Conteúdo do email gerado por IA.'
      }

      return this.getBasicHTMLTemplate(content, title)
    } catch (error) {
      console.error('❌ [AI SERVICE] Erro ao extrair conteúdo:', error)
      return this.getBasicHTMLTemplate('Email gerado por IA')
    }
  }

  // ✅ NOVO: Template HTML básico e válido
  private getBasicHTMLTemplate(content: string, title?: string): string {
    const emailTitle = title || 'Email Gerado'
    
    return `<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${emailTitle}</title>
    <style>
        body { 
            margin: 0; 
            padding: 0; 
            font-family: Arial, sans-serif; 
            background-color: #f4f4f4; 
        }
        .email-container { 
            max-width: 600px; 
            margin: 0 auto; 
            background-color: #ffffff; 
        }
        .email-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 30px 20px;
            text-align: center;
        }
        .email-content {
            padding: 30px 20px;
            line-height: 1.6;
            color: #333333;
        }
        .cta-button {
            background: linear-gradient(135deg, #28a745, #20c997);
            color: #ffffff;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 25px;
            font-weight: bold;
            display: inline-block;
            margin: 20px 0;
        }
        .email-footer {
            background-color: #f8f9fa;
            padding: 20px;
            text-align: center;
            color: #666666;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="email-header">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">${emailTitle}</h1>
        </div>
        <div class="email-content">
            ${content.includes('<') ? content : `<p>${content}</p>`}
        </div>
        <div class="email-footer">
            <p>© 2025 MailTrendz. Email gerado por IA.</p>
        </div>
    </div>
</body>
</html>`
  }

  // ✅ MELHORADO: Sistema de fallback robusto
  private generateFallbackEmailImproved(prompt: string, context: any) {
    console.log('🔄 [AI SERVICE] Gerando email com sistema de fallback melhorado...')
    
    const promptLower = prompt.toLowerCase()
    
    // Análise inteligente do prompt
    const analysis = this.analyzePrompt(promptLower)
    
    // Gerar assunto baseado na análise
    const subject = this.generateSubjectFromAnalysis(analysis, prompt)
    
    // Gerar preview
    const previewText = this.generatePreviewFromAnalysis(analysis)
    
    // Gerar conteúdo principal
    const content = this.generateContentFromAnalysis(analysis, prompt, context)
    
    // Montar HTML final
    const html = this.getBasicHTMLTemplate(content, subject)
    
    return {
      subject,
      previewText,
      html,
      text: content.replace(/<[^>]*>/g, '')
    }
  }

  // ✅ NOVO: Análise inteligente do prompt
  private analyzePrompt(promptLower: string) {
    const analysis = {
      type: 'newsletter',
      industry: 'geral',
      urgency: 'normal',
      keywords: [],
      hasDiscount: false,
      discount: null,
      hasPrice: false,
      price: null,
      tone: 'profissional'
    }

    // Detectar tipo de email
    if (promptLower.includes('promoção') || promptLower.includes('desconto') || promptLower.includes('oferta') || promptLower.includes('liquidação')) {
      analysis.type = 'promotional'
    } else if (promptLower.includes('boas-vindas') || promptLower.includes('bem-vindo') || promptLower.includes('cadastro')) {
      analysis.type = 'welcome'
    } else if (promptLower.includes('campanha') || promptLower.includes('marketing') || promptLower.includes('anúncio')) {
      analysis.type = 'campaign'
    } else if (promptLower.includes('lembrete') || promptLower.includes('carrinho') || promptLower.includes('abandonado')) {
      analysis.type = 'reminder'
    }

    // Detectar indústria
    if (promptLower.includes('emagrecimento') || promptLower.includes('dieta') || promptLower.includes('fitness')) {
      analysis.industry = 'saude'
    } else if (promptLower.includes('curso') || promptLower.includes('educação') || promptLower.includes('aprender')) {
      analysis.industry = 'educacao'
    } else if (promptLower.includes('software') || promptLower.includes('app') || promptLower.includes('tecnologia')) {
      analysis.industry = 'tecnologia'
    } else if (promptLower.includes('loja') || promptLower.includes('produto') || promptLower.includes('venda')) {
      analysis.industry = 'ecommerce'
    }

    // Detectar urgência
    if (promptLower.includes('urgente') || promptLower.includes('última chance') || promptLower.includes('termina')) {
      analysis.urgency = 'high'
    } else if (promptLower.includes('relaxado') || promptLower.includes('informativo')) {
      analysis.urgency = 'low'
    }

    // Detectar desconto
    const discountMatch = promptLower.match(/(\d+)%/)
    if (discountMatch) {
      analysis.hasDiscount = true
      analysis.discount = discountMatch[1]
    }

    // Detectar preço
    const priceMatch = promptLower.match(/(\d+)\s*reais?/i)
    if (priceMatch) {
      analysis.hasPrice = true
      analysis.price = priceMatch[1]
    }

    // Detectar tom
    if (promptLower.includes('formal') || promptLower.includes('elegante')) {
      analysis.tone = 'formal'
    } else if (promptLower.includes('casual') || promptLower.includes('descontraído')) {
      analysis.tone = 'casual'
    } else if (promptLower.includes('amigável') || promptLower.includes('próximo')) {
      analysis.tone = 'friendly'
    }

    return analysis
  }

  // ✅ NOVO: Gerar assunto baseado na análise
  private generateSubjectFromAnalysis(analysis: any, prompt: string): string {
    const baseSubjects = {
      promotional: [
        `${analysis.hasDiscount ? `${analysis.discount}% OFF! ` : ''}Oferta Especial`,
        `${analysis.hasDiscount ? `Desconto de ${analysis.discount}%! ` : ''}Não Perca`,
        `${analysis.urgency === 'high' ? 'ÚLTIMAS HORAS! ' : ''}Promoção Imperdível`
      ],
      welcome: [
        'Bem-vindo! Vamos começar?',
        'É um prazer ter você conosco',
        'Sua jornada começa agora'
      ],
      campaign: [
        'Novidade especial para você',
        'Conheça nossa campanha',
        'Oportunidade única'
      ],
      reminder: [
        'Você esqueceu algo importante',
        'Lembrete: seu carrinho te espera',
        'Finalize sua compra'
      ],
      newsletter: [
        'Suas novidades chegaram',
        'Newsletter com conteúdo exclusivo',
        'Informações importantes'
      ]
    }

    const options = baseSubjects[analysis.type as keyof typeof baseSubjects] || baseSubjects.newsletter
    const selected = options[Math.floor(Math.random() * options.length)]
    
    // Personalizar com base no prompt se possível
    const words = prompt.split(' ').filter(w => w.length > 3).slice(0, 2)
    if (words.length > 0 && !selected.includes('!')) {
      return `${selected} - ${words.join(' ')}`
    }
    
    return selected
  }

  // ✅ NOVO: Gerar preview baseado na análise
  private generatePreviewFromAnalysis(analysis: any): string {
    const previews = {
      promotional: [
        `${analysis.hasDiscount ? `Economize ${analysis.discount}%! ` : ''}Aproveite enquanto durarem os estoques`,
        'Oferta válida por tempo limitado',
        'Condições especiais só para você'
      ],
      welcome: [
        'É um prazer ter você conosco! Vamos começar?',
        'Você fez uma excelente escolha',
        'Bem-vindo à nossa comunidade'
      ],
      campaign: [
        'Descubra tudo que preparamos para você',
        'Novidades exclusivas chegaram',
        'Conteúdo especial te espera'
      ],
      reminder: [
        'Seus itens ainda estão reservados',
        'Complete sua compra com desconto',
        'Não perca esta oportunidade'
      ],
      newsletter: [
        'Confira as novidades desta semana',
        'Conteúdo exclusivo e dicas importantes',
        'Informações que você não pode perder'
      ]
    }

    const options = previews[analysis.type as keyof typeof previews] || previews.newsletter
    return options[Math.floor(Math.random() * options.length)]
  }

  // ✅ NOVO: Gerar conteúdo baseado na análise
  private generateContentFromAnalysis(analysis: any, prompt: string, context: any): string {
    const contentTemplates = {
      promotional: `
        <h2>🎯 Oferta Especial!</h2>
        <p>Esta é uma oportunidade imperdível para você aproveitar nossos melhores produtos com condições especiais.</p>
        ${analysis.hasDiscount ? `
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
          <h3 style="margin: 0; color: #dc3545;">🔥 ${analysis.discount}% de desconto!</h3>
          <p style="margin: 10px 0 0 0; color: #666;">Economize agora mesmo</p>
        </div>
        ` : ''}
        ${analysis.hasPrice ? `
        <div style="text-align: center; margin: 20px 0;">
          <p style="font-size: 24px; font-weight: bold; color: #28a745; margin: 0;">
            R$ ${analysis.price}
          </p>
        </div>
        ` : ''}
        <div style="text-align: center; margin: 30px 0;">
          <a href="#" class="cta-button">🚀 Aproveitar Oferta</a>
        </div>
      `,
      welcome: `
        <h2>🎉 Bem-vindo!</h2>
        <p>É um prazer ter você conosco! Estamos muito felizes que você tenha decidido fazer parte da nossa comunidade.</p>
        <p>Aqui você encontrará:</p>
        <ul>
          <li>✅ Conteúdo exclusivo e de qualidade</li>
          <li>✅ Ofertas especiais para membros</li>
          <li>✅ Suporte dedicado</li>
          <li>✅ Novidades em primeira mão</li>
        </ul>
        <div style="text-align: center; margin: 30px 0;">
          <a href="#" class="cta-button">🚀 Começar Agora</a>
        </div>
      `,
      campaign: `
        <h2>📢 Campanha Especial</h2>
        <p>Preparamos algo muito especial para você! Nossa nova campanha traz benefícios únicos.</p>
        <p>Confira os destaques:</p>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; font-weight: bold;">🌟 Benefícios exclusivos desta campanha</p>
          <p style="margin: 5px 0 0 0; color: #666;">Condições especiais que você não encontra em outro lugar</p>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="#" class="cta-button">💪 Participar da Campanha</a>
        </div>
      `,
      reminder: `
        <h2>⏰ Lembrete Importante</h2>
        <p>Notamos que você demonstrou interesse em nossos produtos, mas ainda não finalizou sua compra.</p>
        <p>Não se preocupe! Seus itens ainda estão reservados e você pode finalizar quando quiser.</p>
        <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
          <p style="margin: 0; font-weight: bold;">🛒 Seus itens te esperam</p>
          <p style="margin: 5px 0 0 0;">Finalize sua compra antes que o estoque acabe</p>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="#" class="cta-button">🛍️ Finalizar Compra</a>
        </div>
      `,
      newsletter: `
        <h2>📧 Newsletter</h2>
        <p>Suas informações importantes chegaram! Confira as novidades que selecionamos especialmente para você.</p>
        <p>Nesta edição você encontra:</p>
        <ul>
          <li>📰 Novidades do setor</li>
          <li>💡 Dicas exclusivas</li>
          <li>🎯 Conteúdo selecionado</li>
          <li>📊 Insights importantes</li>
        </ul>
        <div style="text-align: center; margin: 30px 0;">
          <a href="#" class="cta-button">📖 Ler Newsletter Completa</a>
        </div>
      `
    }

    return contentTemplates[analysis.type as keyof typeof contentTemplates] || contentTemplates.newsletter
  }

  // Helper methods
  private generateFallbackSubject(prompt: string): string {
    const words = prompt.split(' ').filter(w => w.length > 3).slice(0, 3)
    return words.length > 0 
      ? `Email - ${words.join(' ')}`
      : 'Email Gerado por IA'
  }

  private generateFallbackPreview(subject: string): string {
    return `${subject} - Confira os detalhes dentro!`
  }

  private generateFallbackText(prompt: string): string {
    return `Conteúdo do email baseado em: ${prompt.substring(0, 100)}...`
  }
}

export default new AIService()