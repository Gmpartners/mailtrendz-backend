const mongoose = require('mongoose');
require('dotenv').config();

async function testMongoDB() {
  console.log('🧪 Testando conexão MongoDB...');
  
  const uri = process.env.MONGODB_URI;
  console.log('🔗 URI:', uri ? uri.substring(0, 30) + '...' : 'URI não encontrada');
  
  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    console.log('✅ Conectado ao MongoDB');
    
    // Testar query simples
    const db = mongoose.connection.db;
    const project = await db.collection('projects').findOne({
      _id: new mongoose.Types.ObjectId('68476981e433b220d31b08ca')
    });
    
    console.log('📋 Projeto encontrado:', !!project);
    if (project) {
      console.log('  - Nome:', project.name);
      console.log('  - ChatId:', project.chatId?.toString() || 'Não definido');
    }
    
    await mongoose.disconnect();
    console.log('🔌 Desconectado');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

testMongoDB();