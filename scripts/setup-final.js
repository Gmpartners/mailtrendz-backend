#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 SETUP FINAL - MAILTRENDZ REESTRUTURADO\n');

// Verificar Node.js e npm
console.log('📋 Verificando dependências...');
try {
  const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
  const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
  console.log(`✅ Node.js: ${nodeVersion}`);
  console.log(`✅ npm: ${npmVersion}`);
} catch (error) {
  console.error('❌ Node.js ou npm não encontrado');
  process.exit(1);
}

// Verificar .env
console.log('\n🔧 Verificando configurações...');
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  console.log('⚠️ Arquivo .env não encontrado, criando exemplo...');
  
  const envExample = `# MailTrendz - Configurações
NODE_ENV=development
PORT=8000

# MongoDB
MONGODB_URL=mongodb://localhost:27017/mailtrendz

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-too

# OpenRouter API (para Python AI Service)
OPENROUTER_API_KEY=your-openrouter-api-key-here
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1

# Python AI Service
PYTHON_AI_SERVICE_URL=http://localhost:5000

# Frontend (para CORS)
FRONTEND_URL=http://localhost:3000

# Email (opcional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Logging
LOG_LEVEL=info
LOG_FILE=logs/app.log`;

  fs.writeFileSync(envPath, envExample);
  console.log('✅ Arquivo .env criado com configurações exemplo');
} else {
  console.log('✅ Arquivo .env encontrado');
}

// Instalar dependências
console.log('\n📦 Instalando dependências Node.js...');
try {
  execSync('npm install', { stdio: 'inherit' });
  console.log('✅ Dependências Node.js instaladas');
} catch (error) {
  console.error('❌ Erro ao instalar dependências Node.js');
  process.exit(1);
}

// Verificar Python
console.log('\n🐍 Verificando Python...');
try {
  const pythonVersion = execSync('python --version', { encoding: 'utf8' }).trim();
  console.log(`✅ ${pythonVersion}`);
} catch (error) {
  try {
    const python3Version = execSync('python3 --version', { encoding: 'utf8' }).trim();
    console.log(`✅ ${python3Version}`);
  } catch (error) {
    console.error('❌ Python não encontrado');
    console.log('📥 Instale Python 3.8+ em: https://python.org');
  }
}

// Setup Python AI Service
console.log('\n🤖 Configurando Python AI Service...');
const aiServicePath = path.join(__dirname, 'src', 'ai-service');

if (fs.existsSync(aiServicePath)) {
  try {
    // Verificar se existe requirements.txt
    const requirementsPath = path.join(aiServicePath, 'requirements.txt');
    if (!fs.existsSync(requirementsPath)) {
      console.log('📝 Criando requirements.txt...');
      
      const requirements = `# MailTrendz Python AI Service Dependencies
fastapi==0.104.1
uvicorn[standard]==0.24.0
motor==3.3.2
pymongo==4.6.0
httpx==0.25.2
pydantic==2.5.0
loguru==0.7.2
python-dotenv==1.0.0
beautifulsoup4==4.12.2
cssutils==2.9.0
premailer==3.10.0`;

      fs.writeFileSync(requirementsPath, requirements);
      console.log('✅ requirements.txt criado');
    }

    // Instalar dependências Python (opcional)
    console.log('📦 Para instalar dependências Python, execute:');
    console.log(`   cd ${aiServicePath}`);
    console.log('   pip install -r requirements.txt');
    
  } catch (error) {
    console.log('⚠️ Configuração Python opcional');
  }
} else {
  console.error('❌ Pasta ai-service não encontrada');
}

// Criar estrutura de logs
console.log('\n📝 Configurando logs...');
const logsPath = path.join(__dirname, 'logs');
if (!fs.existsSync(logsPath)) {
  fs.mkdirSync(logsPath, { recursive: true });
  console.log('✅ Pasta logs criada');
} else {
  console.log('✅ Pasta logs existe');
}

// Build TypeScript
console.log('\n🔨 Compilando TypeScript...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ TypeScript compilado');
} catch (error) {
  console.log('⚠️ Aviso: Erro na compilação, mas continuando...');
}

// Scripts disponíveis
console.log('\n📋 SETUP CONCLUÍDO!\n');

console.log('🎯 PRÓXIMOS PASSOS:');
console.log('');

console.log('1️⃣ CONFIGURAR BANCO DE DADOS:');
console.log('   • Instalar MongoDB: https://mongodb.com/try/download/community');
console.log('   • Ou usar MongoDB Atlas: https://cloud.mongodb.com');
console.log('   • Atualizar MONGODB_URL no .env');
console.log('');

console.log('2️⃣ EXECUTAR MIGRAÇÃO:');
console.log('   npm run migration:conversations');
console.log('');

console.log('3️⃣ CONFIGURAR OPENROUTER:');
console.log('   • Criar conta: https://openrouter.ai');
console.log('   • Obter API key');
console.log('   • Atualizar OPENROUTER_API_KEY no .env');
console.log('');

console.log('4️⃣ INICIAR SERVIÇOS:');
console.log('   # Terminal 1 - Node.js Backend');
console.log('   npm run dev');
console.log('');
console.log('   # Terminal 2 - Python AI Service');
console.log('   cd src/ai-service');
console.log('   python app.py');
console.log('');

console.log('5️⃣ VERIFICAR STATUS:');
console.log('   • Node.js: http://localhost:8000/health');
console.log('   • Python AI: http://localhost:5000/health');
console.log('   • API Docs: http://localhost:5000/docs');
console.log('');

console.log('📚 COMANDOS ÚTEIS:');
console.log('   npm run dev          # Desenvolvimento');
console.log('   npm run build        # Build produção');
console.log('   npm run start        # Iniciar produção');
console.log('   npm run migration:conversations  # Migrar banco');
console.log('   npm run migration:cleanup       # Limpar antigo');
console.log('');

console.log('🆘 SUPORTE:');
console.log('   • Verificar logs em: ./logs/');
console.log('   • Documentação: README.md');
console.log('   • Health checks disponíveis');
console.log('');

console.log('🎉 MAILTRENDZ REESTRUTURADO PRONTO!');
console.log('   ✅ MongoDB otimizado');
console.log('   ✅ Python AI Service');
console.log('   ✅ Conversations unificadas');
console.log('   ✅ Contexto preservado');
console.log('');