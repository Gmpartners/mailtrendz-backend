const axios = require('axios');

async function testOpenRouter() {
  console.log('🤖 Testando OpenRouter...');
  
  try {
    const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
      model: 'anthropic/claude-3.5-sonnet',
      messages: [
        { 
          role: 'user', 
          content: 'Responda apenas "OpenRouter funcionando perfeitamente!" se você receber esta mensagem.' 
        }
      ],
      max_tokens: 50,
      temperature: 0.1
    }, {
      headers: {
        'Authorization': 'Bearer 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',
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://mailtrendz-backend.onrender.com',
        'X-Title': 'MailTrendz Test'
      },
      timeout: 30000
    });
    
    console.log('✅ OpenRouter funcionando:');
    console.log('  - Status:', response.status);
    console.log('  - Modelo:', response.data.model);
    console.log('  - Resposta:', response.data.choices[0].message.content);
    console.log('  - Tokens:', response.data.usage);
    
    return true;
  } catch (error) {
    console.error('❌ Erro OpenRouter:');
    console.error('  - Mensagem:', error.message);
    if (error.response) {
      console.error('  - Status:', error.response.status);
      console.error('  - Headers:', error.response.headers);
      console.error('  - Data:', JSON.stringify(error.response.data, null, 2));
    }
    
    return false;
  }
}

// Teste secundário com modelo de fallback
async function testFallbackModel() {
  console.log('🔄 Testando modelo de fallback...');
  
  try {
    const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
      model: 'openai/gpt-3.5-turbo',
      messages: [
        { 
          role: 'user', 
          content: 'Teste rápido - responda apenas "OK"' 
        }
      ],
      max_tokens: 10,
      temperature: 0.1
    }, {
      headers: {
        'Authorization': 'Bearer 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',
        'Content-Type': 'application/json'
      },
      timeout: 15000
    });
    
    console.log('✅ Modelo fallback funcionando:', response.data.choices[0].message.content);
    return true;
  } catch (error) {
    console.error('❌ Modelo fallback falhou:', error.response?.data || error.message);
    return false;
  }
}

// Executar testes
async function runTests() {
  console.log('='.repeat(50));
  console.log('🧪 TESTE OPENROUTER - MAILTRENDZ');
  console.log('='.repeat(50));
  
  const primaryTest = await testOpenRouter();
  console.log('');
  
  if (!primaryTest) {
    const fallbackTest = await testFallbackModel();
    
    if (!fallbackTest) {
      console.log('');
      console.log('❌ PROBLEMA IDENTIFICADO:');
      console.log('  1. Verifique se a API key tem créditos');
      console.log('  2. Confirme se não há limites de rate limiting');
      console.log('  3. Teste manualmente em https://openrouter.ai/playground');
      console.log('');
    }
  }
  
  console.log('='.repeat(50));
  console.log('✅ Teste finalizado');
  console.log('='.repeat(50));
}

if (require.main === module) {
  runTests();
}

module.exports = { testOpenRouter, testFallbackModel };