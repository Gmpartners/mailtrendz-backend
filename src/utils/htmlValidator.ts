// ✅ Utilitário para validação e formatação de HTML de emails
export class EmailHTMLValidator {
  // Removidas as propriedades estáticas não utilizadas para evitar erros de compilação
  // Mantidas como comentários para referência futura
  
  // private static readonly ALLOWED_TAGS = [
  //   'html', 'head', 'body', 'title', 'meta', 'style', 'link',
  //   'table', 'tbody', 'thead', 'tfoot', 'tr', 'td', 'th',
  //   'div', 'span', 'p', 'br', 'hr', 'img', 'a',
  //   'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  //   'strong', 'b', 'em', 'i', 'u', 'small',
  //   'ul', 'ol', 'li', 'center', 'font'
  // ]

  private static readonly DANGEROUS_ATTRIBUTES = [
    'onclick', 'onload', 'onerror', 'onmouseover', 'onmouseout',
    'onfocus', 'onblur', 'onchange', 'onsubmit', 'onreset'
  ]

  // private static readonly REQUIRED_META_TAGS = [
  //   '<meta charset="UTF-8">',
  //   '<meta name="viewport" content="width=device-width, initial-scale=1.0">'
  // ]

  /**
   * Valida e sanitiza HTML para emails
   */
  static validateAndSanitize(html: string): {
    isValid: boolean
    sanitizedHTML: string
    issues: string[]
    fixes: string[]
  } {
    const issues: string[] = []
    const fixes: string[] = []
    let sanitizedHTML = html

    try {
      // 1. Verificar se é HTML válido
      if (!html || typeof html !== 'string') {
        issues.push('HTML vazio ou inválido')
        sanitizedHTML = this.createFallbackHTML('Conteúdo não disponível')
        fixes.push('HTML gerado automaticamente')
        return { isValid: false, sanitizedHTML, issues, fixes }
      }

      // 2. Remover scripts maliciosos
      sanitizedHTML = this.removeScripts(sanitizedHTML)
      if (sanitizedHTML !== html) {
        issues.push('Scripts JavaScript removidos')
        fixes.push('Removidos scripts para segurança')
      }

      // 3. Remover atributos perigosos
      const cleanHTML = this.removeDangerousAttributes(sanitizedHTML)
      if (cleanHTML !== sanitizedHTML) {
        issues.push('Atributos de evento removidos')
        fixes.push('Removidos event handlers inseguros')
        sanitizedHTML = cleanHTML
      }

      // 4. Verificar estrutura básica
      if (!this.hasBasicStructure(sanitizedHTML)) {
        issues.push('Estrutura HTML incompleta')
        sanitizedHTML = this.wrapInEmailStructure(sanitizedHTML)
        fixes.push('Estrutura de email adicionada')
      }

      // 5. Verificar compatibilidade com clientes de email
      const compatibilityIssues = this.checkEmailCompatibility(sanitizedHTML)
      issues.push(...compatibilityIssues)

      // 6. Validar CSS inline
      const cssIssues = this.validateInlineCSS(sanitizedHTML)
      issues.push(...cssIssues)

      // 7. Verificar acessibilidade
      const accessibilityIssues = this.checkAccessibility(sanitizedHTML)
      issues.push(...accessibilityIssues)

      return {
        isValid: issues.length === 0,
        sanitizedHTML,
        issues,
        fixes
      }
    } catch (error) {
      console.error('Erro na validação de HTML:', error)
      return {
        isValid: false,
        sanitizedHTML: this.createFallbackHTML('Erro ao processar HTML'),
        issues: ['Erro crítico na validação'],
        fixes: ['HTML de fallback gerado']
      }
    }
  }

  /**
   * Remove scripts e conteúdo perigoso
   */
  private static removeScripts(html: string): string {
    return html
      .replace(/<script[^>]*>.*?<\/script>/gis, '')
      .replace(/<iframe[^>]*>.*?<\/iframe>/gis, '')
      .replace(/javascript:/gi, '')
      .replace(/vbscript:/gi, '')
      .replace(/data:text\/html/gi, '')
  }

  /**
   * Remove atributos perigosos
   */
  private static removeDangerousAttributes(html: string): string {
    let cleanHTML = html

    this.DANGEROUS_ATTRIBUTES.forEach(attr => {
      const regex = new RegExp(`\\s${attr}\\s*=\\s*["'][^"']*["']`, 'gi')
      cleanHTML = cleanHTML.replace(regex, '')
    })

    return cleanHTML
  }

  /**
   * Verifica se tem estrutura HTML básica
   */
  private static hasBasicStructure(html: string): boolean {
    const hasDoctype = html.includes('<!DOCTYPE') || html.includes('<!doctype')
    const hasHtml = html.includes('<html') && html.includes('</html>')
    const hasHead = html.includes('<head') && html.includes('</head>')
    const hasBody = html.includes('<body') && html.includes('</body>')

    return hasDoctype && hasHtml && hasHead && hasBody
  }

  /**
   * Envolve conteúdo em estrutura de email
   */
  private static wrapInEmailStructure(content: string): string {
    // Se já tem estrutura completa, não modificar
    if (this.hasBasicStructure(content)) {
      return content
    }

    // Se tem apenas body content, envolver
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>Email Marketing</title>
    <style>
        /* Reset básico para emails */
        body, table, td, p, a, li, blockquote { 
            -webkit-text-size-adjust: 100%; 
            -ms-text-size-adjust: 100%; 
        }
        table, td { 
            mso-table-lspace: 0pt; 
            mso-table-rspace: 0pt; 
        }
        img { 
            -ms-interpolation-mode: bicubic; 
            border: 0; 
            outline: none; 
            text-decoration: none; 
        }
        
        /* Estilos principais */
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f4f4f4;
            color: #333333;
            line-height: 1.6;
        }
        
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        
        .email-content {
            padding: 20px;
        }
        
        .btn {
            display: inline-block;
            padding: 12px 24px;
            background-color: #007bff;
            color: white !important;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
            text-align: center;
            transition: background-color 0.3s ease;
        }
        
        .btn:hover {
            background-color: #0056b3;
        }
        
        h1, h2, h3, h4, h5, h6 {
            color: #333333;
            margin-bottom: 15px;
            line-height: 1.2;
        }
        
        p {
            color: #666666;
            line-height: 1.6;
            margin-bottom: 15px;
        }
        
        .footer {
            background-color: #f8f9fa;
            padding: 15px;
            text-align: center;
            font-size: 12px;
            color: #888888;
            border-top: 1px solid #e9ecef;
        }
        
        /* Responsividade */
        @media only screen and (max-width: 600px) {
            .email-container {
                max-width: 100% !important;
                margin: 0 !important;
                border-radius: 0 !important;
            }
            
            .email-content {
                padding: 15px !important;
            }
            
            h1 { font-size: 24px !important; }
            h2 { font-size: 20px !important; }
            h3 { font-size: 18px !important; }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="email-content">
            ${content}
        </div>
        <div class="footer">
            <p>© ${new Date().getFullYear()} - Email gerado por MailTrendz</p>
            <p>Esta mensagem foi gerada automaticamente por IA</p>
        </div>
    </div>
</body>
</html>`
  }

  /**
   * Cria HTML de fallback seguro
   */
  private static createFallbackHTML(message: string): string {
    return this.wrapInEmailStructure(`
      <div style="text-align: center; padding: 40px 20px;">
        <h2 style="color: #333; margin-bottom: 20px;">Email Gerado Automaticamente</h2>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #007bff;">
          <p style="color: #666; margin: 0; font-size: 16px;">${message}</p>
        </div>
        <p style="color: #888; font-size: 14px;">
          Este email foi gerado pela IA do MailTrendz. Você pode editá-lo através do chat.
        </p>
        <div style="margin-top: 30px;">
          <a href="#" class="btn" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            Saiba Mais
          </a>
        </div>
      </div>
    `)
  }

  /**
   * Verifica compatibilidade com clientes de email
   */
  private static checkEmailCompatibility(html: string): string[] {
    const issues: string[] = []

    // Verificar uso de CSS não suportado
    if (html.includes('display: flex') || html.includes('display:flex')) {
      issues.push('CSS Flexbox pode não funcionar em todos os clientes de email')
    }

    if (html.includes('display: grid') || html.includes('display:grid')) {
      issues.push('CSS Grid não é suportado na maioria dos clientes de email')
    }

    if (html.includes('position: absolute') || html.includes('position:absolute')) {
      issues.push('Posicionamento absoluto pode causar problemas em emails')
    }

    // Verificar estrutura de tabela para layout
    if (!html.includes('<table') && html.includes('<div')) {
      issues.push('Considere usar tabelas para layout em vez de divs para maior compatibilidade')
    }

    // Verificar imagens sem alt
    const imgMatches = html.match(/<img[^>]*>/gi)
    if (imgMatches) {
      imgMatches.forEach(img => {
        if (!img.includes('alt=')) {
          issues.push('Imagem sem texto alternativo (alt) encontrada')
        }
      })
    }

    return issues
  }

  /**
   * Valida CSS inline
   */
  private static validateInlineCSS(html: string): string[] {
    const issues: string[] = []

    // Verificar se há CSS inline suficiente
    if (!html.includes('style=')) {
      issues.push('Falta de CSS inline pode causar problemas de renderização')
    }

    // Verificar propriedades CSS problemáticas
    if (html.includes('background-image') && !html.includes('background-color')) {
      issues.push('Use background-color como fallback para background-image')
    }

    return issues
  }

  /**
   * Verifica acessibilidade básica
   */
  private static checkAccessibility(html: string): string[] {
    const issues: string[] = []

    // Verificar títulos
    if (!html.includes('<h1') && !html.includes('<h2')) {
      issues.push('Email sem estrutura de títulos (h1, h2, etc.)')
    }

    // Verificar contraste (básico)
    if (html.includes('color: white') && html.includes('background-color: white')) {
      issues.push('Possível problema de contraste detectado')
    }

    // Verificar links
    const linkMatches = html.match(/<a[^>]*>/gi)
    if (linkMatches) {
      linkMatches.forEach(link => {
        if (!link.includes('title=') && !link.includes('aria-label=')) {
          issues.push('Link sem texto descritivo encontrado')
        }
      })
    }

    return issues
  }

  /**
   * Extrai texto plano do HTML
   */
  static extractPlainText(html: string): string {
    try {
      return html
        .replace(/<style[^>]*>.*?<\/style>/gis, '') // Remove CSS
        .replace(/<script[^>]*>.*?<\/script>/gis, '') // Remove JS
        .replace(/<[^>]+>/g, ' ') // Remove todas as tags
        .replace(/\s+/g, ' ') // Normaliza espaços
        .replace(/&nbsp;/g, ' ') // Substitui &nbsp;
        .replace(/&amp;/g, '&') // Substitui &amp;
        .replace(/&lt;/g, '<') // Substitui &lt;
        .replace(/&gt;/g, '>') // Substitui &gt;
        .replace(/&quot;/g, '"') // Substitui &quot;
        .trim()
    } catch (error) {
      console.error('Erro ao extrair texto plano:', error)
      return 'Erro ao processar conteúdo de texto'
    }
  }

  /**
   * Calcula score de qualidade do HTML
   */
  static calculateQualityScore(html: string): {
    score: number
    breakdown: {
      structure: number
      compatibility: number
      accessibility: number
      content: number
    }
  } {
    let structureScore = 0
    let compatibilityScore = 0
    let accessibilityScore = 0
    let contentScore = 0

    try {
      // Score de estrutura (0-25)
      if (this.hasBasicStructure(html)) structureScore += 10
      if (html.includes('<meta charset')) structureScore += 5
      if (html.includes('<meta name="viewport"')) structureScore += 5
      if (html.includes('<title>')) structureScore += 5

      // Score de compatibilidade (0-25)
      if (html.includes('<table')) compatibilityScore += 10
      if (html.includes('style=')) compatibilityScore += 10
      if (!html.includes('display: flex') && !html.includes('display: grid')) compatibilityScore += 5

      // Score de acessibilidade (0-25)
      if (html.includes('<h1') || html.includes('<h2')) accessibilityScore += 10
      if (html.includes('alt=')) accessibilityScore += 10
      if (html.includes('title=') || html.includes('aria-label=')) accessibilityScore += 5

      // Score de conteúdo (0-25)
      const textLength = this.extractPlainText(html).length
      if (textLength > 50) contentScore += 10
      if (textLength > 200) contentScore += 5
      if (html.includes('<a ')) contentScore += 5
      if (html.includes('btn') || html.includes('button')) contentScore += 5

      const totalScore = structureScore + compatibilityScore + accessibilityScore + contentScore

      return {
        score: Math.min(totalScore, 100),
        breakdown: {
          structure: structureScore,
          compatibility: compatibilityScore,
          accessibility: accessibilityScore,
          content: contentScore
        }
      }
    } catch (error) {
      console.error('Erro ao calcular quality score:', error)
      return {
        score: 0,
        breakdown: {
          structure: 0,
          compatibility: 0,
          accessibility: 0,
          content: 0
        }
      }
    }
  }

  /**
   * Otimiza HTML para clientes de email
   */
  static optimizeForEmailClients(html: string): string {
    try {
      let optimizedHTML = html

      // Converter CSS moderno para compatível
      optimizedHTML = optimizedHTML.replace(/display:\s*flex/gi, 'display: table-cell')
      optimizedHTML = optimizedHTML.replace(/display:\s*grid/gi, 'display: table')

      // Adicionar CSS de reset básico se não existir  
      if (!optimizedHTML.includes('mso-table-lspace')) {
        const resetCSS = `
        <style>
          body, table, td, p, a, li, blockquote { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
          table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
          img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
        </style>`
        
        optimizedHTML = optimizedHTML.replace('</head>', resetCSS + '</head>')
      }

      return optimizedHTML
    } catch (error) {
      console.error('Erro ao otimizar HTML:', error)
      return html
    }
  }
}

// ✅ Função utilitária para uso fácil
export const validateEmailHTML = (html: string) => {
  return EmailHTMLValidator.validateAndSanitize(html)
}

export const createSafeEmailHTML = (content: string) => {
  const validation = EmailHTMLValidator.validateAndSanitize(content)
  return validation.sanitizedHTML
}

export const calculateEmailQuality = (html: string) => {
  return EmailHTMLValidator.calculateQualityScore(html)
}

export default EmailHTMLValidator
