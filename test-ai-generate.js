const axios = require('axios');

async function testAIGenerate() {
  console.log('🧪 Testando geração de email...\n');
  
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODQ1MGRhMDkzYjI0ODlmZmM1MGQ2ODUiLCJlbWFpbCI6ImFnb3JhZm9pQGdtYWlsLmNvbSIsInN1YnNjcmlwdGlvbiI6ImVudGVycHJpc2UiLCJpYXQiOjE3NDk5MzQxMTgsImV4cCI6MTc1MDAyMDUxOH0.mXq9jbmqPsN32HxFiO76YcNvFkWxTRUl8-ewI6_FduY'
  
  try {
    const response = await axios.post(
      'https://mailtrendz-backend-production-5f73.up.railway.app/api/v1/ai/generate',
      {
        prompt: 'Crie um email de boas-vindas para novos clientes da nossa loja online',
        industry: 'ecommerce',
        tone: 'friendly',
        urgency: 'low'
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );
    
    console.log('✅ Sucesso!');
    console.log('Status:', response.status);
    console.log('Assunto:', response.data.data.subject);
    console.log('Preview:', response.data.data.preview_text);
    console.log('Processamento:', response.data.metadata.processing_time + 'ms');
    
  } catch (error) {
    console.log('❌ Erro:');
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('Error:', error.message);
    }
  }
}

testAIGenerate();
