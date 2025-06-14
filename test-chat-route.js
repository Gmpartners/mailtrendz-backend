const https = require('https');

function testChatRoute() {
    const projectId = '684debcf3a081f3686d6826a';
    
    const options = {
        hostname: 'mailtrendz-backend-production-5f73.up.railway.app',
        port: 443,
        path: `/api/v1/chats/project/${projectId}`,
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Test-Script/1.0'
        }
    };

    console.log(`🔍 Testando rota problemática: ${options.path}`);
    
    const req = https.request(options, (res) => {
        console.log(`📊 Status Code: ${res.statusCode}`);
        console.log(`📋 Headers:`, res.headers);
        
        let data = '';
        res.on('data', (chunk) => {
            data += chunk;
        });
        
        res.on('end', () => {
            console.log('📦 Response Body:', data);
            
            if (res.statusCode === 500) {
                console.log('\n❌ ERRO 500 DETECTADO!');
                console.log('🔧 Possíveis causas:');
                console.log('   1. Erro no código da rota');
                console.log('   2. Problema na query do MongoDB');
                console.log('   3. Middleware com erro');
                console.log('   4. Validação de parâmetros');
            }
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

// Teste também outras rotas relacionadas
function testRelatedRoutes() {
    console.log('\n🚀 Testando rotas relacionadas...\n');
    
    // Teste 1: Rota problemática
    testChatRoute();
    
    // Teste 2: Rota de projetos (que está funcionando)
    setTimeout(() => {
        const options = {
            hostname: 'mailtrendz-backend-production-5f73.up.railway.app',
            port: 443,
            path: '/api/v1/projects?page=1&limit=12',
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        };

        console.log('\n✅ Testando rota que funciona: /api/v1/projects');
        
        const req = https.request(options, (res) => {
            console.log(`📊 Projects Status: ${res.statusCode}`);
            
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                if (data.length > 500) {
                    console.log('📦 Projects Response: [DADOS GRANDES - MOSTRANDO INÍCIO]');
                    console.log(data.substring(0, 200) + '...');
                } else {
                    console.log('📦 Projects Response:', data);
                }
            });
        });

        req.on('error', (error) => {
            console.error('❌ Erro Projects:', error.message);
        });

        req.end();
    }, 2000);
}

testRelatedRoutes();