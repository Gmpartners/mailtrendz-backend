import { logger } from './logger'
import cheerio from 'cheerio'

/**
 * Gera HTML de exemplo baseado no prompt
 */
export const generateFallbackHTML = (prompt: string) => {
  logger.info('🧪 [FALLBACK] Gerando HTML de exemplo para prompt:', prompt.substring(0, 50))
  
  const promptLower = prompt.toLowerCase()
  let html = ''
  let subject = 'Email Personalizado'
  let emailType = 'generic'
  
  if (promptLower.includes('promocional') || promptLower.includes('produto') || 
      promptLower.includes('emagrecimento') || promptLower.includes('oferta')) {
    emailType = 'promotional'
    subject = 'Oferta Especial - Transformação Garantida!'
    html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${subject}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 24px; background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%); }
        .container { max-width: 600px; margin: 0 auto; }
        .header-card { background: linear-gradient(135deg, #1e40af 0%, #7c3aed 100%); border-radius: 20px 20px 0 0; padding: 32px; text-align: center; }
        .header { color: #ffffff; font-size: 36px; font-weight: 800; margin: 0; line-height: 1.2; }
        .content-card { background: #ffffff; padding: 32px; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb; }
        .subtitle { color: #1f2937; font-size: 18px; line-height: 1.6; margin-bottom: 32px; text-align: center; }
        .benefits-card { background: #f8fafc; padding: 32px; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb; }
        .benefit { display: flex; align-items: center; margin-bottom: 16px; color: #1f2937; font-weight: 600; font-size: 16px; }
        .check { color: #059669; font-weight: 700; margin-right: 12px; font-size: 18px; }
        .cta-card { background: #ffffff; padding: 32px; text-align: center; border-radius: 0 0 20px 20px; border: 1px solid #e5e7eb; }
        .cta { background: linear-gradient(135deg, #1e40af 0%, #7c3aed 100%); color: white; padding: 20px 40px; text-decoration: none; border-radius: 16px; display: inline-block; font-weight: 700; font-size: 18px; box-shadow: 0 8px 25px rgba(30,64,175,0.3); transition: transform 0.2s; }
        .cta:hover { transform: translateY(-2px); }
        .footer-text { color: #6b7280; font-size: 14px; text-align: center; margin-top: 24px; }
        .badge { background: #fbbf24; color: #92400e; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: 600; display: inline-block; margin-bottom: 16px; }
        @media (max-width: 600px) { 
            body { padding: 16px; } 
            .header-card, .content-card, .benefits-card, .cta-card { padding: 24px; }
            .header { font-size: 28px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header-card">
            <div class="badge">🔥 OFERTA LIMITADA</div>
            <h1 class="header">Transforme Seu Corpo em 30 Dias!</h1>
        </div>
        
        <div class="content-card">
            <p class="subtitle">Descubra o método revolucionário que já ajudou mais de 10.000 pessoas a conquistar o corpo dos sonhos com resultados comprovados.</p>
        </div>
        
        <div class="benefits-card">
            <div class="benefit"><span class="check">✅</span> Resultados visíveis em até 30 dias</div>
            <div class="benefit"><span class="check">✅</span> Método 100% natural e seguro</div>
            <div class="benefit"><span class="check">✅</span> Aprovado por especialistas</div>
            <div class="benefit"><span class="check">✅</span> Suporte completo durante a jornada</div>
        </div>
        
        <div class="cta-card">
            <a href="#" class="cta">QUERO CONHECER O MÉTODO</a>
            <p class="footer-text">Oferta por tempo limitado. Não perca essa oportunidade única!</p>
        </div>
    </div>
</body>
</html>`
  } else if (promptLower.includes('newsletter') || promptLower.includes('informativo')) {
    emailType = 'newsletter'
    subject = 'Newsletter Semanal - Principais Novidades'
    html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${subject}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 24px; background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%); }
        .container { max-width: 600px; margin: 0 auto; }
        .header-card { background: linear-gradient(135deg, #059669 0%, #047857 100%); border-radius: 20px 20px 0 0; padding: 32px; text-align: center; }
        .header { color: #ffffff; font-size: 36px; font-weight: 800; margin: 0; }
        .subtitle-card { background: #ffffff; padding: 32px; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb; }
        .subtitle { color: #1f2937; text-align: center; font-size: 18px; margin: 0; }
        .news-item { background: #f0f9ff; border-radius: 16px; padding: 24px; margin: 16px 32px; border-left: 4px solid #3b82f6; position: relative; }
        .news-item:nth-child(even) { background: #f0fdf4; border-left-color: #059669; }
        .news-item:nth-child(3n) { background: #fef3c7; border-left-color: #f59e0b; }
        .news-title { color: #1f2937; font-weight: 700; font-size: 18px; margin-bottom: 12px; display: flex; align-items: center; }
        .news-icon { margin-right: 8px; font-size: 20px; }
        .news-desc { color: #4b5563; font-size: 16px; line-height: 1.6; }
        .footer-card { background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); border-radius: 0 0 20px 20px; padding: 32px; text-align: center; }
        .footer-text { color: #ffffff; font-size: 16px; font-weight: 600; margin: 0; }
        @media (max-width: 600px) { 
            body { padding: 16px; } 
            .header-card, .subtitle-card, .footer-card { padding: 24px; }
            .news-item { margin: 16px 16px; padding: 20px; }
            .header { font-size: 28px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header-card">
            <h1 class="header">📰 Newsletter Semanal</h1>
        </div>
        
        <div class="subtitle-card">
            <p class="subtitle">Fique por dentro das principais novidades e atualizações desta semana!</p>
        </div>
        
        <div style="background: #ffffff; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
            <div class="news-item">
                <div class="news-title"><span class="news-icon">🚀</span> Novos Recursos Lançados</div>
                <div class="news-desc">Descobra as últimas funcionalidades que irão melhorar sua experiência e produtividade.</div>
            </div>
            
            <div class="news-item">
                <div class="news-title"><span class="news-icon">💡</span> Dicas de Otimização</div>
                <div class="news-desc">Aprenda técnicas avançadas para maximizar seus resultados e alcançar seus objetivos mais rapidamente.</div>
            </div>
            
            <div class="news-item">
                <div class="news-title"><span class="news-icon">👥</span> Atualizações da Comunidade</div>
                <div class="news-desc">Veja o que outros usuários estão compartilhando e como você pode se inspirar em suas estratégias.</div>
            </div>
        </div>
        
        <div class="footer-card">
            <p class="footer-text">Obrigado por fazer parte da nossa comunidade! 📬</p>
        </div>
    </div>
</body>
</html>`
  } else {
    html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${subject}</title>
    <style>
        body { margin: 0; padding: 24px; background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
        .email-container { max-width: 600px; margin: 0 auto; }
        .header-card { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-radius: 20px 20px 0 0; padding: 32px; text-align: center; }
        .email-title { color: #ffffff; font-size: 36px; font-weight: 800; margin: 0; line-height: 1.2; }
        .content-card { background: #ffffff; padding: 40px; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb; text-align: center; }
        .email-content { color: #1f2937; font-size: 18px; line-height: 1.7; margin-bottom: 32px; }
        .prompt-card { background: #f0f9ff; padding: 32px; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb; }
        .prompt-box { background: #ffffff; border-radius: 16px; padding: 24px; border-left: 4px solid #3b82f6; text-align: left; box-shadow: 0 4px 12px rgba(59,130,246,0.1); }
        .prompt-label { color: #3b82f6; font-weight: 700; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; }
        .prompt-text { color: #1f2937; font-style: italic; font-size: 16px; line-height: 1.6; margin: 0; }
        .footer-card { background: linear-gradient(135deg, #1f2937 0%, #374151 100%); border-radius: 0 0 20px 20px; padding: 32px; text-align: center; }
        .footer-text { color: #ffffff; font-size: 16px; font-weight: 600; margin: 0; }
        @media (max-width: 600px) { 
            body { padding: 16px; }
            .header-card, .content-card, .prompt-card, .footer-card { padding: 24px; }
            .email-title { font-size: 28px; }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header-card">
            <h1 class="email-title">Olá! 👋</h1>
        </div>
        
        <div class="content-card">
            <p class="email-content">Este é um email personalizado criado especialmente para você.</p>
        </div>
        
        <div class="prompt-card">
            <div class="prompt-box">
                <div class="prompt-label">💭 Sua solicitação</div>
                <p class="prompt-text">"${prompt}"</p>
            </div>
        </div>
        
        <div class="footer-card">
            <p class="footer-text">Estamos trabalhando para criar uma experiência ainda mais personalizada e completa! ✨</p>
        </div>
    </div>
</body>
</html>`
  }

  return { html, subject, emailType }
}

/**
 * Processa imagens no HTML convertendo para base64 quando necessário
 */
export const processImagesHTML = async (html: string): Promise<string> => {
  if (!html || html.trim() === '') {
    return html
  }

  try {
    const $ = cheerio.load(html)
    const images = $('img')
    
    if (images.length === 0) {
      return html
    }

    logger.info('🖼️ [EMAIL] Processing images:', { count: images.length })

    // Por enquanto, apenas log - implementação completa pode ser adicionada depois
    images.each((_, img) => {
      const src = $(img).attr('src')
      if (src) {
        logger.debug('📸 [EMAIL] Found image:', { src: src.substring(0, 50) + '...' })
      }
    })

    return html
  } catch (error) {
    logger.error('❌ [EMAIL] Error processing images:', error)
    return html
  }
}

/**
 * Processa array de imagens e retorna URLs e intenções processadas
 */
export const processImages = (images: any[]) => {
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