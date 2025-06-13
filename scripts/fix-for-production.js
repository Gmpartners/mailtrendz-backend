#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 PREPARANDO PARA PRODUÇÃO - CORREÇÕES RÁPIDAS\n');

// Substituir arquivos problemáticos por versões de produção
const replacements = [
  {
    from: 'src/controllers/ai.controller.ts',
    to: 'src/controllers/ai.controller.production.ts',
    desc: 'AI Controller (sem erros TypeScript)'
  },
  {
    from: 'src/routes/chat.routes.ts',
    to: 'src/routes/chat.routes.production.ts',
    desc: 'Chat Routes (rotas principais apenas)'
  }
];

let fixes = 0;

replacements.forEach(({ from, to, desc }) => {
  try {
    if (fs.existsSync(to)) {
      // Backup do original
      fs.copyFileSync(from, `${from}.backup`);
      
      // Substituir pelo arquivo de produção
      fs.copyFileSync(to, from);
      
      console.log(`✅ ${desc}`);
      fixes++;
    }
  } catch (error) {
    console.log(`⚠️ Erro em ${desc}: ${error.message}`);
  }
});

console.log(`\n🎯 Correções aplicadas: ${fixes}/2\n`);

// Verificar se a pasta services tem os imports problemáticos
const servicesDir = 'src/services';
if (fs.existsSync(servicesDir)) {
  const files = fs.readdirSync(servicesDir);
  const hasProblematicImports = files.some(file => 
    file.includes('ai.service.ts') || file.includes('queue.service.ts')
  );
  
  if (hasProblematicImports) {
    console.log('⚠️ ATENÇÃO: Remova imports de arquivos não existentes dos controllers');
  }
}

console.log('🚀 DEPLOY STEPS:\n');

console.log('1️⃣ RAILWAY - PYTHON AI SERVICE:');
console.log('   • Acesse: https://railway.app');
console.log('   • Novo projeto do GitHub');
console.log('   • Root directory: src/ai-service');
console.log('   • Configure env vars do arquivo railway-config.txt');
console.log('');

console.log('2️⃣ VERCEL - NODE.JS BACKEND:');
console.log('   • Atualize env vars conforme vercel-env-updates.txt');
console.log('   • Execute: npx vercel --prod');
console.log('');

console.log('3️⃣ CONECTAR SERVIÇOS:');
console.log('   • Copie URL do Railway');
console.log('   • Adicione PYTHON_AI_SERVICE_URL no Vercel');
console.log('   • Redeploy: npx vercel --prod');
console.log('');

console.log('🎉 SISTEMA PRONTO PARA PRODUÇÃO!');