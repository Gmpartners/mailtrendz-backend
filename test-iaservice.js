require('dotenv').config();

// Mock do logger para evitar erros
const logger = {
  info: (...args) => console.log('INFO:', ...args),
  warn: (...args) => console.warn('WARN:', ...args),
  error: (...args) => console.error('ERROR:', ...args)
};

// Mock do CSS inliner
const inlineStyles = (html) => html;

// Simular o iaService
class TestIAService {
  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY || '';
    this.model = process.env.OPENROUTER_MODEL || 'anthropic/claude-sonnet-4';
    this.baseUrl = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
    
    console.log('🔧 IA Service Configuration:');
    console.log('- API Key presente:', !!this.apiKey);
    console.log('- Modelo:', this.model);
    console.log('- Base URL:', this.baseUrl);
    
    if (!this.apiKey) {
      console.error('❌ OPENROUTER_API_KEY não configurada');
      return;
    }
  }

  async generateHTML(request) {
    const axios = require('axios');
    const startTime = Date.now();
    
    try {
      console.log('🚀 Iniciando geração de HTML...');
      console.log('- Input:', request.userInput.substring(0, 50) + '...');
      console.log('- Images:', request.imageUrls?.length || 0);
      
      let userPrompt = request.userInput;
      
      if (request.imageUrls && request.imageUrls.length > 0) {
        userPrompt += `\n\nIMPORTANTE: Integre essas imagens no email HTML:`;
        request.imageUrls.forEach((url, index) => {
          userPrompt += `\nImagem ${index + 1}: ${url}`;
        });
      }
      
      const systemPrompt = `Você é um especialista em criação de HTML para emails marketing. Crie um HTML simples e funcional.

INSTRUÇÕES:
1. Retorne apenas HTML limpo e responsivo
2. Use CSS inline para compatibilidade
3. Não use emojis
4. Tamanho de fonte padrão: 18px
5. Se houver imagens, integre-as no layout

Retorne apenas o HTML, sem explicações.`;
      
      console.log('📡 Fazendo requisição para OpenRouter...');
      
      const response = await axios.post(`${this.baseUrl}/chat/completions`, {
        model: this.model,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.7
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
          'X-Title': 'MailTrendz'
        },
        timeout: 30000
      });

      if (!response.data?.choices?.[0]?.message?.content) {
        throw new Error('Resposta inválida da API OpenRouter');
      }

      let html = response.data.choices[0].message.content.trim();
      
      // Limpar HTML
      html = html.replace(/```html/g, '').replace(/```/g, '').trim();
      
      const processingTime = Date.now() - startTime;
      
      console.log('✅ HTML gerado com sucesso!');
      console.log('- Tempo de processamento:', processingTime + 'ms');
      console.log('- Tamanho do HTML:', html.length, 'caracteres');
      console.log('- Preview:', html.substring(0, 100) + '...');
      
      return {
        html,
        subject: this.extractSubject(request.userInput),
        response: 'HTML gerado com sucesso via IA!',
        metadata: {
          model: this.model,
          processingTime,
          generatedAt: new Date().toISOString(),
          originalPrompt: request.userInput,
          isGenerated: true,
          service: 'test-ia-service',
          imagesAnalyzed: request.imageUrls?.length || 0
        }
      };
      
    } catch (error) {
      console.error('❌ Erro na geração de HTML:', error.message);
      if (error.response) {
        console.error('- Status:', error.response.status);
        console.error('- Data:', error.response.data);
      }
      throw error;
    }
  }

  extractSubject(userInput) {
    const input = userInput.toLowerCase();
    
    if (input.includes('promocional') || input.includes('produto') || input.includes('oferta')) {
      return 'Oferta Especial - Não Perca';
    } else if (input.includes('newsletter') || input.includes('novidades')) {
      return 'Newsletter - Principais Novidades';
    } else {
      return 'Email Personalizado';
    }
  }

  isEnabled() {
    return !!this.apiKey;
  }
}

// Testar o serviço
async function testIAService() {
  console.log('🧪 Testando IA Service MailTrendz...\n');
  
  const iaService = new TestIAService();
  
  if (!iaService.isEnabled()) {
    console.error('❌ IA Service não habilitado - verifique OPENROUTER_API_KEY');
    return;
  }
  
  try {
    const result = await iaService.generateHTML({
      userInput: 'Crie um email promocional sobre um produto de emagrecimento com 50% de desconto',
      context: {
        industry: 'saude',
        tone: 'persuasive',
        urgency: 'high'
      }
    });
    
    console.log('\n✅ TESTE PASSOU!');
    console.log('- Subject:', result.subject);
    console.log('- Response:', result.response);
    console.log('- Metadata:', result.metadata);
    
    return true;
    
  } catch (error) {
    console.error('\n❌ TESTE FALHOU:', error.message);
    return false;
  }
}

testIAService();