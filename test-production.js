const mongoose = require('mongoose');

async function testMongoConnection() {
  const mongoUri = 'mongodb+srv://mailtrendz:mailtrendz123@mailtrendz-cluster.699h6t1.mongodb.net/mailtrendz?retryWrites=true&w=majority&appName=mailtrendz-cluster';
  
  console.log('🔗 Testando conexão MongoDB Atlas...');
  console.log('URI:', mongoUri.replace(/:[^:@]*@/, ':***@')); // Ocultar senha
  
  try {
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000
    });
    
    console.log('✅ MongoDB Atlas conectado com sucesso!');
    console.log('📊 Database:', mongoose.connection.name);
    console.log('🏷️ Estado:', mongoose.connection.readyState);
    
    // Testar uma operação simples
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('📁 Collections disponíveis:', collections.map(c => c.name).join(', ') || 'Nenhuma');
    
    await mongoose.disconnect();
    console.log('🔌 Desconectado do MongoDB Atlas');
    
  } catch (error) {
    console.error('❌ Erro ao conectar com MongoDB Atlas:');
    console.error('Tipo:', error.name);
    console.error('Mensagem:', error.message);
    
    if (error.name === 'MongoNetworkError') {
      console.error('💡 Verifique:');
      console.error('   - Conexão com internet');
      console.error('   - IP liberado no MongoDB Atlas');
      console.error('   - Credenciais corretas');
    }
    
    if (error.name === 'MongooseServerSelectionError') {
      console.error('💡 Possível problema:');
      console.error('   - Cluster MongoDB pode estar dormindo');
      console.error('   - Firewall bloqueando conexão');
    }
  }
}

async function testRenderBackend() {
  const backendUrl = 'https://mailtrendz-backend.onrender.com';
  
  console.log('\n🌐 Testando Backend Render...');
  console.log('URL:', backendUrl);
  
  try {
    const https = require('https');
    const options = {
      hostname: 'mailtrendz-backend.onrender.com',
      path: '/health',
      method: 'GET',
      timeout: 30000 // 30 segundos
    };
    
    const response = await new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => resolve({ status: res.statusCode, data, headers: res.headers }));
      });
      
      req.on('error', reject);
      req.on('timeout', () => reject(new Error('Timeout - Backend pode estar dormindo')));
      req.setTimeout(30000);
      req.end();
    });
    
    console.log('✅ Backend Render respondeu!');
    console.log('📊 Status:', response.status);
    console.log('⏱️ Response time:', response.headers['x-response-time'] || 'N/A');
    
    if (response.data) {
      try {
        const parsed = JSON.parse(response.data);
        console.log('📄 Resposta:', JSON.stringify(parsed, null, 2));
      } catch {
        console.log('📄 Resposta (texto):', response.data.substring(0, 200));
      }
    }
    
  } catch (error) {
    console.error('❌ Erro ao conectar com Backend Render:');
    console.error('Mensagem:', error.message);
    
    if (error.message.includes('Timeout')) {
      console.error('💡 Backend pode estar em cold start (dormindo)');
      console.error('   Aguarde alguns minutos e tente novamente');
    }
    
    if (error.code === 'ENOTFOUND') {
      console.error('💡 DNS não encontrado - verifique a URL do Render');
    }
  }
}

async function runTests() {
  console.log('====================================================');
  console.log('🧪 TESTE COMPLETO - MONGODB ATLAS + RENDER');
  console.log('====================================================\n');
  
  await testMongoConnection();
  await testRenderBackend();
  
  console.log('\n====================================================');
  console.log('✅ TESTES CONCLUÍDOS');
  console.log('====================================================');
}

runTests().catch(console.error);
