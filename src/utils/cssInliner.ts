import * as cheerio from 'cheerio'

export function inlineStyles(html: string): string {
  try {
    const $ = cheerio.load(html)
    
    // Extrair CSS das tags <style>
    let allCSS = ''
    $('style').each((_, element) => {
      allCSS += $(element).html() || ''
    })
    
    if (!allCSS) {
      return html
    }
    
    // Parse CSS rules
    const cssRules = parseCSSRules(allCSS)
    
    // Aplicar estilos inline para cada elemento
    cssRules.forEach(rule => {
      try {
        $(rule.selector).each((_, element) => {
          const $element = $(element)
          const existingStyle = $element.attr('style') || ''
          const newStyle = existingStyle + '; ' + rule.declarations
          $element.attr('style', newStyle.replace(/^;\s*/, ''))
        })
      } catch (selectorError) {
        // Ignora seletores inválidos ou complexos
      }
    })
    
    // Remover tags <style> após aplicar inline
    $('style').remove()
    
    return $.html()
    
  } catch (error) {
    console.error('Erro no CSS inlining:', error)
    return html
  }
}

interface CSSRule {
  selector: string
  declarations: string
}

function parseCSSRules(css: string): CSSRule[] {
  const rules: CSSRule[] = []
  
  // Remove comentários CSS
  css = css.replace(/\/\*[\s\S]*?\*\//g, '')
  
  // Regex para capturar regras CSS básicas
  const ruleRegex = /([^{]+)\s*\{\s*([^}]+)\s*\}/g
  let match
  
  while ((match = ruleRegex.exec(css)) !== null) {
    const selector = match[1].trim()
    const declarations = match[2].trim()
    
    // Filtrar seletores simples (evitar pseudo-classes, media queries, etc.)
    if (isSimpleSelector(selector)) {
      rules.push({ selector, declarations })
    }
  }
  
  return rules
}

function isSimpleSelector(selector: string): boolean {
  // Aceitar apenas seletores simples para emails
  const simplePatterns = [
    /^[a-zA-Z][a-zA-Z0-9]*$/, // tag simples: body, p, h1
    /^\.[a-zA-Z][a-zA-Z0-9_-]*$/, // classe simples: .container, .button
    /^#[a-zA-Z][a-zA-Z0-9_-]*$/, // id simples: #header
    /^[a-zA-Z][a-zA-Z0-9]*\s*,\s*[a-zA-Z][a-zA-Z0-9]*$/ // múltiplos tags: h1, h2
  ]
  
  return simplePatterns.some(pattern => pattern.test(selector.trim()))
}

export default { inlineStyles }