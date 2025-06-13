#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚀 PREPARANDO PARA RAILWAY DEPLOY\n');

// Verificar se arquivos necessários existem
const checks = [
    { file: 'src/ai-service/app.py', desc: 'Python AI Service' },
    { file: 'src/ai-service/requirements.txt', desc: 'Python dependencies' },
    { file: 'package.json', desc: 'Node.js package.json' },
    { file: 'src/models/Conversation.model.ts', desc: 'Sistema reestruturado' }
];

let allGood = true;

console.log('🔍 VERIFICANDO ARQUIVOS NECESSÁRIOS:');
checks.forEach(({ file, desc }) => {
    if (fs.existsSync(file)) {
        console.log(`✅ ${desc}`);
    } else {
        console.log(`❌ ${desc} - ${file} não encontrado`);
        allGood = false;
    }
});

console.log('');

if (!allGood) {
    console.log('❌ Arquivos necessários em falta! Execute a reestruturação primeiro.');
    process.exit(1);
}

// Criar arquivo de configuração Railway
const railwayConfig = `# Railway Configuration - MailTrendz Backend
[build]
builder = "NIXPACKS"

[deploy]
startCommand = "npm start"
healthcheckPath = "/health"
healthcheckTimeout = 300`;

fs.writeFileSync('railway.toml', railwayConfig);
console.log('✅ railway.toml criado para Node.js Backend');

// Verificar se railway.toml existe no ai-service
const aiServiceRailway = 'src/ai-service/railway.toml';
if (!fs.existsSync(aiServiceRailway)) {
    const aiConfig = `# Railway Configuration - Python AI Service
[build]
builder = "NIXPACKS"

[deploy]
startCommand = "python app.py"
healthcheckPath = "/health"
healthcheckTimeout = 300`;
    
    fs.writeFileSync(aiServiceRailway, aiConfig);
    console.log('✅ railway.toml criado para Python AI Service');
}

console.log('\n🎯 RESUMO PARA RAILWAY:\n');

console.log('1️⃣ PYTHON AI SERVICE:');
console.log('   📁 Root Directory: src/ai-service');
console.log('   🐍 Runtime: Python 3.11');
console.log('   ⚡ Start Command: python app.py');
console.log('   🔗 Health Check: /health');
console.log('');

console.log('2️⃣ NODE.JS BACKEND:');
console.log('   📁 Root Directory: / (raiz)');
console.log('   🟢 Runtime: Node.js 18');
console.log('   ⚡ Start Command: npm start');
console.log('   🔗 Health Check: /health');
console.log('');

console.log('🔧 ENVIRONMENT VARIABLES:');
console.log('');

console.log('📋 Python AI Service:');
console.log('   OPENROUTER_API_KEY=sk-or-v1-2fd78d6d42a8ab5a90b52459dc51d7cf2f9a3d40ec4bce512568d1167ff9c1f');
console.log('   MONGODB_URI=mongodb+srv://mailtrendz:mailtrendz123@mailtrendz-cluster.690h6t1.mongodb.net/mailtrendz?retryWrites=true&w=majority&appName=mailtrendz-cluster');
console.log('   PORT=5000');
console.log('   NODE_ENV=production');
console.log('');

console.log('📋 Node.js Backend (suas env vars + nova):');
console.log('   [Todas suas env vars do Vercel]');
console.log('   PYTHON_AI_SERVICE_URL=https://seu-python-ai.railway.app');
console.log('');

console.log('🎯 PRÓXIMOS PASSOS:');
console.log('1. Acesse: https://railway.app');
console.log('2. Conecte GitHub');
console.log('3. Deploy Python AI primeiro (src/ai-service)');
console.log('4. Copie URL do Python AI');
console.log('5. Deploy Node.js com a URL copiada');
console.log('6. Teste ambos health checks');
console.log('');

console.log('📖 GUIA COMPLETO: RAILWAY_DEPLOY_GUIDE.md');
console.log('');

console.log('✅ TUDO PRONTO PARA RAILWAY! 🚀');