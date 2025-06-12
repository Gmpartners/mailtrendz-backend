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
      console.log('🎯 [AI SERVICE] Tentando gerar email com Enhanced AI...')
      
      const smartRequest = {
        prompt,
        projectContext: context,
        useEnhanced: true
      }

      const enhancedContent = await EnhancedAIService.generateSmartEmail(smartRequest)

      return {
        subject: enhancedContent.subject,
        previewText: enhancedContent.previewText,
        html: enhancedContent.html,
        text: enhancedContent.html.replace(/<[^>]*>/g, '')
      }
    } catch (error) {
      console.error('❌ [AI SERVICE] Enhanced AI falhou, usando fallback:', error)
      
      // Sistema de fallback - gerar email usando templates
      return this.generateFallbackEmail(prompt, context)
    }
  }

  async improveEmail(content: any, feedback: string, context: any) {
    try {
      const enhancedResponse = await EnhancedAIService.smartChatWithAI(
        `Melhore este email com base no feedback: ${feedback}`,
        [],
        context
      )

      if (enhancedResponse.enhancedContent) {
        return {
          subject: enhancedResponse.enhancedContent.subject,
          previewText: enhancedResponse.enhancedContent.previewText,
          html: enhancedResponse.enhancedContent.html,
          text: enhancedResponse.enhancedContent.html?.replace(/<[^>]*>/g, '') || ''
        }
      }

      return content
    } catch (error) {
      console.error('❌ [AI SERVICE] Erro ao melhorar email, usando original:', error)
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

  private generateFallbackEmail(prompt: string, context: any) {
    console.log('🔄 [AI SERVICE] Gerando email de fallback...')
    
    const promptLower = prompt.toLowerCase()
    
    // Detectar tipo de email baseado no prompt
    let template = 'newsletter'
    if (promptLower.includes('promoção') || promptLower.includes('desconto') || promptLower.includes('oferta')) {
      template = 'promotional'
    } else if (promptLower.includes('boas-vindas') || promptLower.includes('bem-vindo')) {
      template = 'welcome'
    } else if (promptLower.includes('campanha') || promptLower.includes('marketing')) {
      template = 'campaign'
    }

    // Detectar produto/serviço
    let productContext = 'nosso produto'
    if (promptLower.includes('emagrecimento') || promptLower.includes('dieta')) {
      productContext = 'produto de emagrecimento'
    } else if (promptLower.includes('curso') || promptLower.includes('educação')) {
      productContext = 'curso online'
    } else if (promptLower.includes('software') || promptLower.includes('app')) {
      productContext = 'software'
    }

    // Detectar desconto
    let discount = null
    const discountMatch = prompt.match(/(\d+)%/)
    if (discountMatch) {
      discount = discountMatch[1]
    }

    // Detectar preço
    let price = null
    const priceMatch = prompt.match(/(\d+)\s*reais?/i)
    if (priceMatch) {
      price = priceMatch[1]
    }

    return this.buildEmailFromTemplate(template, {
      product: productContext,
      discount,
      price,
      context,
      originalPrompt: prompt
    })
  }

  private buildEmailFromTemplate(template: string, data: any) {
    const templates = {
      promotional: {
        subject: `${data.discount ? `${data.discount}% OFF! ` : ''}Oferta Especial - ${data.product}`,
        previewText: `Não perca esta oportunidade única${data.discount ? ` - ${data.discount}% de desconto` : ''}!`,
        html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Oferta Especial</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
    <table width="100%" border="0" cellpadding="0" cellspacing="0">
        <tr>
            <td align="center" style="padding: 20px;">
                <table width="600" border="0" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">
                                ${data.discount ? `${data.discount}% OFF! 🎉` : 'Oferta Especial! 🎯'}
                            </h1>
                            <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">
                                Oportunidade única para você!
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 24px;">
                                Conheça nosso ${data.product}
                            </h2>
                            
                            <p style="color: #666666; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">
                                Esta é uma oportunidade imperdível para você transformar seus resultados com nosso ${data.product}.
                            </p>
                            
                            ${data.price ? `
                            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
                                <p style="margin: 0; color: #666666; font-size: 16px;">Preço especial:</p>
                                <p style="margin: 5px 0 0 0; font-size: 32px; font-weight: bold; color: #28a745;">
                                    ${data.discount ? `<span style="text-decoration: line-through; color: #999; font-size: 24px;">R$ ${Math.round(data.price / (1 - data.discount/100))}</span> ` : ''}
                                    R$ ${data.price}
                                </p>
                                ${data.discount ? `<p style="margin: 0; color: #dc3545; font-weight: bold;">Economize ${data.discount}%!</p>` : ''}
                            </div>
                            ` : ''}
                            
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="#" style="background: linear-gradient(135deg, #28a745, #20c997); color: #ffffff; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; font-size: 18px; display: inline-block; transition: transform 0.2s;">
                                    🚀 Aproveitar Oferta
                                </a>
                            </div>
                            
                            <p style="color: #666666; line-height: 1.6; margin: 20px 0 0 0; font-size: 14px; text-align: center;">
                                ⏰ Oferta por tempo limitado!
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e9ecef;">
                            <p style="margin: 0; color: #666666; font-size: 14px;">
                                © 2025 MailTrendz. Todos os direitos reservados.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`
      },
      
      newsletter: {
        subject: `Newsletter - Novidades sobre ${data.product}`,
        previewText: `Confira as últimas novidades e dicas importantes!`,
        html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Newsletter</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
    <table width="100%" border="0" cellpadding="0" cellspacing="0">
        <tr>
            <td align="center" style="padding: 20px;">
                <table width="600" border="0" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
                    <tr>
                        <td style="background-color: #3b82f6; padding: 30px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 26px;">📧 Newsletter</h1>
                            <p style="color: #ffffff; margin: 10px 0 0 0; opacity: 0.9;">
                                Suas informações importantes chegaram!
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px 30px;">
                            <h2 style="color: #333333; margin: 0 0 20px 0;">Olá!</h2>
                            <p style="color: #666666; line-height: 1.6; margin: 0 0 20px 0;">
                                Temos novidades importantes sobre ${data.product} para compartilhar com você.
                            </p>
                            <p style="color: #666666; line-height: 1.6; margin: 0 0 20px 0;">
                                Confira o que preparamos especialmente para você nesta edição.
                            </p>
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="#" style="background-color: #3b82f6; color: #ffffff; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                                    📖 Ler Mais
                                </a>
                            </div>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`
      },

      welcome: {
        subject: `Bem-vindo! Conheça nosso ${data.product}`,
        previewText: `É um prazer ter você conosco! Vamos começar?`,
        html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bem-vindo</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
    <table width="100%" border="0" cellpadding="0" cellspacing="0">
        <tr>
            <td align="center" style="padding: 20px;">
                <table width="600" border="0" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px;">
                    <tr>
                        <td style="background: linear-gradient(135deg, #10b981, #059669); padding: 40px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🎉 Bem-vindo!</h1>
                            <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">
                                É um prazer ter você conosco!
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px 30px;">
                            <h2 style="color: #333333; margin: 0 0 20px 0;">Que alegria ter você aqui!</h2>
                            <p style="color: #666666; line-height: 1.6; margin: 0 0 20px 0;">
                                Você fez uma excelente escolha ao conhecer nosso ${data.product}. 
                                Estamos aqui para ajudar você a alcançar seus objetivos.
                            </p>
                            <p style="color: #666666; line-height: 1.6; margin: 0 0 30px 0;">
                                Vamos começar essa jornada juntos?
                            </p>
                            <div style="text-align: center;">
                                <a href="#" style="background-color: #10b981; color: #ffffff; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; font-size: 16px;">
                                    🚀 Começar Agora
                                </a>
                            </div>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`
      },

      campaign: {
        subject: `Campanha Especial - ${data.product}`,
        previewText: `Não perca esta oportunidade única!`,
        html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Campanha Especial</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
    <table width="100%" border="0" cellpadding="0" cellspacing="0">
        <tr>
            <td align="center" style="padding: 20px;">
                <table width="600" border="0" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px;">
                    <tr>
                        <td style="background: linear-gradient(135deg, #8b5cf6, #7c3aed); padding: 40px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 26px;">🎯 Campanha Especial</h1>
                            <p style="color: #ffffff; margin: 10px 0 0 0; opacity: 0.9;">
                                Uma oportunidade imperdível para você!
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px 30px;">
                            <h2 style="color: #333333; margin: 0 0 20px 0;">Descubra o poder do nosso ${data.product}</h2>
                            <p style="color: #666666; line-height: 1.6; margin: 0 0 20px 0;">
                                Esta é uma oportunidade única para você conhecer e aproveitar tudo que nosso ${data.product} pode oferecer.
                            </p>
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="#" style="background-color: #8b5cf6; color: #ffffff; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                                    💪 Participar da Campanha
                                </a>
                            </div>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`
      }
    }

    const selectedTemplate = templates[template] || templates.newsletter
    
    return {
      subject: selectedTemplate.subject,
      previewText: selectedTemplate.previewText,
      html: selectedTemplate.html,
      text: selectedTemplate.html.replace(/<[^>]*>/g, '')
    }
  }
}

export default new AIService()
