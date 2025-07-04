require('dotenv').config();
const jwt = require('jsonwebtoken');

// Gerar token JWT para teste
function generateTestToken() {
    const payload = {
        sub: 'test-user-id-12345',
        email: 'test@mailtrendz.com',
        aud: 'authenticated',
        role: 'authenticated',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24), // 24 horas
    };
    
    const secret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
    
    const token = jwt.sign(payload, secret);
    
    console.log('🔑 Token JWT gerado para teste:');
    console.log(token);
    console.log('\n📋 Para usar no frontend:');
    console.log(`localStorage.setItem('accessToken', '${token}')`);
    
    return token;
}

// Teste de validação do token
async function testTokenValidation(token) {
    const axios = require('axios');
    
    try {
        console.log('\n🧪 Testando token com endpoint autenticado...');
        
        const response = await axios.post('http://localhost:8000/api/v1/ai/generate', {
            prompt: 'Crie um email promocional sobre um produto de emagrecimento',
            industry: 'saude',
            tone: 'persuasive',
            urgency: 'high'
        }, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Token válido! Resposta:');
        console.log('- Status:', response.status);
        console.log('- Success:', response.data.success);
        console.log('- Message:', response.data.message);
        console.log('- HTML Length:', response.data.data.html.length);
        
        return true;
    } catch (error) {
        console.error('❌ Erro na validação do token:');
        console.error('- Status:', error.response?.status);
        console.error('- Error:', error.response?.data);
        return false;
    }
}

async function main() {
    console.log('🔧 Gerando token JWT para teste do frontend...\n');
    
    const token = generateTestToken();
    await testTokenValidation(token);
}

main();