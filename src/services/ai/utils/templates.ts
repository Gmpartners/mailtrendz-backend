/**
 * ✅ TEMPLATES MODERNOS ORGANIZADOS
 * Centraliza todos os templates para facilitar manutenção
 */

export const EmailTemplates = {
  modern: `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{subject}}</title>
    <style>
        body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center; }
        .header h1 { color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; }
        .content { padding: 40px 30px; line-height: 1.7; }
        .cta { display: inline-block; background: #667eea; color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; }
        .footer { background: #f8f9fa; padding: 30px; text-align: center; color: #666; }
        @media (max-width: 600px) {
            .header, .content, .footer { padding: 25px 20px; }
            .header h1 { font-size: 24px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>{{subject}}</h1>
        </div>
        <div class="content">
            {{content}}
            <p style="text-align: center; margin: 30px 0;">
                <a href="#" class="cta">{{ctaText}}</a>
            </p>
        </div>
        <div class="footer">
            <p>Email criado com MailTrendz</p>
        </div>
    </div>
</body>
</html>`,

  minimal: `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{subject}}</title>
    <style>
        body { margin: 0; padding: 20px; font-family: Arial, sans-serif; color: #333; }
        .container { max-width: 600px; margin: 0 auto; }
        h1 { color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
        .cta { background: #3498db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>{{subject}}</h1>
        {{content}}
        <p><a href="#" class="cta">{{ctaText}}</a></p>
    </div>
</body>
</html>`
}

export const IndustryTemplates = {
  saude: {
    colors: { primary: '#059669', secondary: '#10b981' },
    icon: '🏥',
    trustElements: ['Aprovado pela ANVISA', 'Recomendado por médicos'],
    ctaText: 'Cuidar da Saúde'
  },
  tecnologia: {
    colors: { primary: '#2563eb', secondary: '#3b82f6' },
    icon: '💻',
    trustElements: ['Segurança garantida', 'Suporte 24/7'],
    ctaText: 'Experimentar Agora'
  },
  educacao: {
    colors: { primary: '#8b5cf6', secondary: '#a78bfa' },
    icon: '📚',
    trustElements: ['Certificado reconhecido', '+ 10.000 alunos'],
    ctaText: 'Começar a Aprender'
  },
  ecommerce: {
    colors: { primary: '#16a34a', secondary: '#22c55e' },
    icon: '🛍️',
    trustElements: ['Frete grátis', 'Garantia de 30 dias'],
    ctaText: 'Comprar Agora'
  },
  geral: {
    colors: { primary: '#6366f1', secondary: '#8b5cf6' },
    icon: '✨',
    trustElements: ['Qualidade garantida', 'Atendimento premium'],
    ctaText: 'Saiba Mais'
  }
}

export const StylePresets = {
  professional: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    borderRadius: '8px',
    spacing: '30px'
  },
  friendly: {
    fontFamily: '"Poppins", -apple-system, BlinkMacSystemFont, sans-serif',
    borderRadius: '16px',
    spacing: '25px'
  },
  formal: {
    fontFamily: '"Times New Roman", Times, serif',
    borderRadius: '4px',
    spacing: '35px'
  }
}