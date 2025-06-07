const { MongoClient } = require('mongodb');

const uri = "mongodb+srv://mailtrendz:mailtrendz123@mailtrendz-cluster.699h6tl.mongodb.net/?retryWrites=true&w=majority&appName=mailtrendz-cluster";

async function testConnection() {
  try {
    console.log('🔄 Testando conexão...');
    const client = new MongoClient(uri);
    await client.connect();
    console.log('✅ Conexão bem-sucedida!');
    await client.close();
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

testConnection();