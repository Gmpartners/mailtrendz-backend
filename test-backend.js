const https = require('https');
const http = require('http');

// Teste de conectividade com o backend
function testBackend() {
    const options = {
        hostname: 'mailtrendz-backend-production-5f73.up.railway.app',
        port: 443,
        path: '/api/v1/health',
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    };

    console.log('🔍 Testando conectividade com backend...');
    
    const req = https.request(options, (res) => {
        console.log(`✅ Status: ${res.statusCode}`);
        console.log(`📋 Headers:`, res.headers);
        
        let data = '';
        res.on('data', (chunk) => {
            data += chunk;
        });
        
        res.on('end', () => {
            console.log('📦 Response:', data);
        });
    });

    req.on('error', (error) => {
        console.error('❌ Erro na requisição:', error.message);
    });

    req.setTimeout(10000, () => {
        console.error('⏰ Timeout na requisição');
        req.destroy();
    });

    req.end();
}

// Teste de status dos serviços
function testServices() {
    console.log('\n🚀 Iniciando testes de conectividade...\n');
    
    // Teste 1: Health check
    testBackend();
    
    // Teste 2: Verifica se MongoDB está respondendo
    setTimeout(() => {
        const mongoTest = {
            hostname: 'mailtrendz-backend-production-5f73.up.railway.app',
            port: 443,
            path: '/api/v1/auth/test-db',
            method: 'GET'
        };
        
        console.log('\n🗄️ Testando conexão com MongoDB...');
        
        const req = https.request(mongoTest, (res) => {
            console.log(`✅ MongoDB Status: ${res.statusCode}`);
            
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                console.log('📦 MongoDB Response:', data);
            });
        });

        req.on('error', (error) => {
            console.error('❌ Erro MongoDB:', error.message);
        });

        req.end();
    }, 2000);
}

testServices();