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
    subject = 'Oferta Especial - Produto de Emagrecimento'
    html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${subject}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 30px; }
        .header { text-align: center; color: #2c3e50; margin-bottom: 30px; }
        .cta { background: #e74c3c; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <h1 class="header">🔥 Transforme Seu Corpo em 30 Dias!</h1>
        <p>Descubra o método revolucionário que já ajudou mais de 10.000 pessoas a conquistar o corpo dos sonhos!</p>
        <p>✅ Resultados em até 30 dias<br>
           ✅ Método 100% natural<br>
           ✅ Aprovado por especialistas</p>
        <div style="text-align: center;">
            <a href="#" class="cta">QUERO CONHECER O MÉTODO</a>
        </div>
    </div>
</body>
</html>`
  } else if (promptLower.includes('newsletter') || promptLower.includes('informativo')) {
    emailType = 'newsletter'
    subject = 'Newsletter Semanal - Novidades'
    html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${subject}</title>
</head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f8f9fa;">
    <div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px;">
        <h1 style="color: #343a40; text-align: center;">📰 Newsletter Semanal</h1>
        <p>Fique por dentro das principais novidades da semana!</p>
        <h2>Destaques:</h2>
        <ul>
            <li>Novidade 1: Lorem ipsum dolor sit amet</li>
            <li>Novidade 2: Consectetur adipiscing elit</li>
            <li>Novidade 3: Sed do eiusmod tempor</li>
        </ul>
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
</head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #ffffff;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #333; text-align: center;">Olá!</h1>
        <p>Este é um email personalizado baseado em sua solicitação: "${prompt}"</p>
        <p>Em breve implementaremos uma versão ainda mais personalizada!</p>
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