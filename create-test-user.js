const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function createTestUser() {
  console.log('👤 Criando usuário de teste...');
  
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const db = mongoose.connection.db;
    const userId = new mongoose.Types.ObjectId('68450da093b2489ffc50d685');
    
    // Gerar hash da senha
    const hashedPassword = await bcrypt.hash('test123', 10);
    
    // Atualizar usuário existente
    await db.collection('users').updateOne(
      { _id: userId },
      {
        $set: {
          password: hashedPassword,
          email: 'test@mailtrendz.com',
          name: 'Usuário Teste',
          isVerified: true,
          role: 'user',
          plan: 'free',
          apiUsage: {
            monthly: 0,
            total: 0,
            lastReset: new Date()
          },
          updatedAt: new Date()
        }
      },
      { upsert: true }
    );
    
    console.log('✅ Usuário atualizado com senha: test123');
    
    await mongoose.disconnect();
    
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

createTestUser();