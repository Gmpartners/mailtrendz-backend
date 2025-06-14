const https = require('https');

function testLogin() {
    // Dados de teste para login
    const loginData = {
        email: "teste@teste.com",
        password: "123456"
    };

    const postData = JSON.stringify(loginData);

    const options = {
        hostname: 'mailtrendz-backend-production-5f73.up.railway.app',
        port: 443,
        path: '/api/v1/auth/login',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    console.log('🔑 Testando login...');
    console.log('📧 Email:', loginData.email);
    
    const req = https.request(options, (res) => {
        console.log(`📊 Login Status: ${res.statusCode}`);
        
        let data = '';
        res.on('data', (chunk) => {
            data += chunk;
        });
        
        res.on('end', () => {
            console.log('📦 Login Response:', data);
            
            try {
                const response = JSON.parse(data);
                if (response.success && response.data && response.data.token) {
                    console.log('\n✅ TOKEN ENCONTRADO! Testando com o token...');
                    testChatWithToken(response.data.token);
                } else {
                    console.log('\n❌ Login falhou ou usuário não existe');
                    console.log('🆕 Tentando criar usuário...');
                    testRegister();
                }
            } catch (error) {
                console.log('❌ Erro ao parsear resposta:', error.message);
            }
        });
    });

    req.on('error', (error) => {
        console.error('❌ Erro no login:', error.message);
    });

    req.write(postData);
    req.end();
}

function testRegister() {
    const userData = {
        name: "Teste User",
        email: "teste@teste.com",
        password: "123456"
    };

    const postData = JSON.stringify(userData);

    const options = {
        hostname: 'mailtrendz-backend-production-5f73.up.railway.app',
        port: 443,
        path: '/api/v1/auth/register',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    console.log('👤 Testando registro...');
    
    const req = https.request(options, (res) => {
        console.log(`📊 Register Status: ${res.statusCode}`);
        
        let data = '';
        res.on('data', (chunk) => {
            data += chunk;
        });
        
        res.on('end', () => {
            console.log('📦 Register Response:', data);
            
            try {
                const response = JSON.parse(data);
                if (response.success && response.data && response.data.token) {
                    console.log('\n✅ USUÁRIO CRIADO! Testando com o token...');
                    testChatWithToken(response.data.token);
                } else {
                    console.log('\n❌ Falha no registro');
                }
            } catch (error) {
                console.log('❌ Erro ao parsear resposta:', error.message);
            }
        });
    });

    req.on('error', (error) => {
        console.error('❌ Erro no registro:', error.message);
    });

    req.write(postData);
    req.end();
}

function testChatWithToken(token) {
    const projectId = '684debcf3a081f3686d6826a';
    
    const options = {
        hostname: 'mailtrendz-backend-production-5f73.up.railway.app',
        port: 443,
        path: `/api/v1/chats/project/${projectId}`,
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    };

    console.log('\n🔒 Testando rota de chat COM token...');
    
    const req = https.request(options, (res) => {
        console.log(`📊 Chat Status: ${res.statusCode}`);
        
        let data = '';
        res.on('data', (chunk) => {
            data += chunk;
        });
        
        res.on('end', () => {
            console.log('📦 Chat Response:', data);
            
            if (res.statusCode === 200) {
                console.log('\n🎉 SUCESSO! A rota funciona com autenticação!');
                console.log('🔧 PROBLEMA IDENTIFICADO: Frontend não está enviando o JWT token');
            } else if (res.statusCode === 404) {
                console.log('\n⚠️ Chat não encontrado para este projeto');
                console.log('💡 Isso é normal se o chat não foi criado ainda');
            } else {
                console.log(`\n❌ Ainda há problema: Status ${res.statusCode}`);
            }
        });
    });

    req.on('error', (error) => {
        console.error('❌ Erro na requisição com token:', error.message);
    });

    req.end();
}

// Inicia os testes
console.log('🚀 Testando fluxo completo de autenticação...\n');
testLogin();