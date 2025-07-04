require('dotenv').config();
const axios = require('axios');

async function testOpenRouter() {
    try {
        console.log('🧪 Testando OpenRouter diretamente...');
        console.log('🔑 API Key presente:', !!process.env.OPENROUTER_API_KEY);
        console.log('🔑 API Key length:', process.env.OPENROUTER_API_KEY?.length);
        console.log('🔑 API Key starts with:', process.env.OPENROUTER_API_KEY?.substring(0, 10) + '...');
        
        const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
            model: 'anthropic/claude-sonnet-4',
            messages: [
                {
                    role: 'system',
                    content: 'Você é um especialista em criação de HTML para emails marketing. Crie um HTML simples e funcional.'
                },
                {
                    role: 'user',
                    content: 'Crie um email promocional sobre um produto de emagrecimento'
                }
            ],
            max_tokens: 2000,
            temperature: 0.7
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
                'X-Title': 'MailTrendz'
            },
            timeout: 30000
        });

        console.log('✅ OpenRouter Response Status:', response.status);
        console.log('✅ HTML gerado:', response.data.choices[0].message.content.substring(0, 200) + '...');
        console.log('✅ Tokens usados:', response.data.usage);
        
        return true;
    } catch (error) {
        console.error('❌ Erro no OpenRouter:');
        console.error('Status:', error.response?.status);
        console.error('Data:', error.response?.data);
        console.error('Message:', error.message);
        
        return false;
    }
}

testOpenRouter();