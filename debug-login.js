const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Conectar ao MongoDB
async function connect() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado ao MongoDB');
  } catch (error) {
    console.error('❌ Erro conectando ao MongoDB:', error.message);
    process.exit(1);
  }
}

// Schema do usuário (simplificado)
const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  subscription: { type: String, default: 'free' },
  isEmailVerified: { type: Boolean, default: false },
  apiUsage: {
    currentMonth: { type: Number, default: 0 },
    limit: { type: Number, default: 50 },
    resetDate: { type: Date, default: Date.now }
  },
  preferences: {
    defaultTone: { type: String, default: 'profissional' }
  },
  lastLoginAt: Date
}, { timestamps: true });

userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    return false;
  }
};

const User = mongoose.model('User', userSchema);

async function testUserAndLogin() {
  await connect();

  const testEmail = 'gabrielpaulo404@gmail.com';
  const testPassword = '123456789'; // ou a senha que você está usando

  console.log('\n🔍 Verificando usuários existentes...');

  // Listar todos os usuários
  const allUsers = await User.find({}, 'name email subscription createdAt');
  console.log(`📊 Total de usuários no banco: ${allUsers.length}`);
  
  if (allUsers.length > 0) {
    console.log('\n👥 Usuários encontrados:');
    allUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (${user.email}) - ${user.subscription} - ${user.createdAt}`);
    });
  }

  // Verificar usuário específico
  console.log(`\n🔎 Buscando usuário: ${testEmail}`);
  const user = await User.findOne({ email: testEmail }).select('+password');
  
  if (!user) {
    console.log('❌ Usuário não encontrado!');
    console.log('\n💡 Criando usuário de teste...');
    
    // Criar usuário de teste
    const hashedPassword = await bcrypt.hash(testPassword, 12);
    const newUser = new User({
      name: 'Gabriel Paulo',
      email: testEmail,
      password: hashedPassword,
      isEmailVerified: true
    });
    
    await newUser.save();
    console.log('✅ Usuário de teste criado!');
    console.log(`📧 Email: ${testEmail}`);
    console.log(`🔑 Senha: ${testPassword}`);
  } else {
    console.log('✅ Usuário encontrado!');
    console.log(`👤 Nome: ${user.name}`);
    console.log(`📧 Email: ${user.email}`);
    console.log(`🔒 Password hash: ${user.password.substring(0, 20)}...`);
    
    // Testar senha
    console.log(`\n🔐 Testando senha: "${testPassword}"`);
    const isPasswordValid = await user.comparePassword(testPassword);
    console.log(`✅ Senha válida: ${isPasswordValid}`);
    
    if (!isPasswordValid) {
      console.log('⚠️  Senha incorreta! Atualizando senha...');
      user.password = await bcrypt.hash(testPassword, 12);
      await user.save();
      console.log('✅ Senha atualizada!');
    }
  }

  // Verificar variáveis de ambiente
  console.log('\n🔧 Verificando variáveis de ambiente...');
  console.log(`JWT_SECRET: ${process.env.JWT_SECRET ? '✅ Configurado' : '❌ Não configurado'}`);
  console.log(`JWT_REFRESH_SECRET: ${process.env.JWT_REFRESH_SECRET ? '✅ Configurado' : '❌ Não configurado'}`);
  console.log(`MONGODB_URI: ${process.env.MONGODB_URI ? '✅ Configurado' : '❌ Não configurado'}`);

  await mongoose.disconnect();
  console.log('\n🔌 Desconectado do MongoDB');
}

testUserAndLogin().catch(console.error);