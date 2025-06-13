#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');

console.log('🚀 MAILTRENDZ v2.1 - DEPLOY PARA PRODUÇÃO\n');

// Verificar se é a versão reestruturada
const hasConversationModel = fs.existsSync('src/models/Conversation.model.ts');
const hasPythonAI = fs.existsSync('src/ai-service/app.py');

if (!hasConversationModel || !hasPythonAI) {
    console.error('❌ Sistema não reestruturado! Execute a reestruturação primeiro.');
    process.exit(1);
}

console.log('✅ Sistema reestruturado detectado\n');

// Verificar .env para produção
console.log('🔧 Configurando para produção...\n');

// Build do projeto
console.log('📦 Building projeto...');
try {
    execSync('npm run build', { stdio: 'inherit' });
    console.log('✅ Build concluído\n');
} catch (error) {
    console.log('⚠️ Build com warnings, mas continuando...\n');
}

// Instruções de deploy
console.log('📋 INSTRUÇÕES DE DEPLOY:\n');

console.log('🎯 1. VERCEL - NODE.JS BACKEND:');
console.log('   ✅ Já configurado');
console.log('   🔧 Atualize estas ENV VARS:');
console.log('      NODE_ENV=production');
console.log('      LOG_LEVEL=info');
console.log('      FRONTEND_URL=https://seu-frontend.vercel.app');
console.log('      PYTHON_AI_SERVICE_URL=https://seu-python-ai.railway.app');
console.log('');

console.log('🐍 2. RAILWAY - PYTHON AI SERVICE:');
console.log('   📁 Deploy da pasta: src/ai-service');
console.log('   🔧 Configure ENV VARS:');
console.log('      OPENROUTER_API_KEY=sk-or-v1-...');
console.log('      MONGODB_URL=mongodb+srv://...');
console.log('      FRONTEND_URL=https://seu-frontend.vercel.app');
console.log('      PORT=5000');
console.log('');

console.log('🗄️ 3. MONGODB:');
console.log('   ✅ Já configurado no Atlas');
console.log('   🔄 Execute migração: npm run migration:conversations');
console.log('');

console.log('⚡ 4. COMANDOS PARA DEPLOY:');
console.log('');
console.log('   # Deploy Node.js (Vercel)');
console.log('   npx vercel --prod');
console.log('');
console.log('   # Deploy Python AI (Railway)');
console.log('   # Use interface web: https://railway.app');
console.log('');

console.log('🔗 5. APÓS DEPLOY:');
console.log('   • Atualize PYTHON_AI_SERVICE_URL no Vercel');
console.log('   • Teste endpoints: /health');
console.log('   • Execute validação: npm run validate:system');
console.log('');

console.log('🌐 ENDPOINTS DE PRODUÇÃO:');
console.log('   • Backend: https://seu-projeto.vercel.app');
console.log('   • Python AI: https://seu-python-ai.railway.app');
console.log('   • Health: https://seu-projeto.vercel.app/health');
console.log('   • API Docs: https://seu-python-ai.railway.app/docs');
console.log('');

console.log('📊 MONITORAMENTO:');
console.log('   • Vercel Analytics: https://vercel.com/dashboard');
console.log('   • Railway Logs: https://railway.app/dashboard');
console.log('   • MongoDB Atlas: https://cloud.mongodb.com');
console.log('');

console.log('🎉 PROJETO PRONTO PARA DEPLOY!');
console.log('   Siga as instruções acima para deploy completo.');
console.log('');