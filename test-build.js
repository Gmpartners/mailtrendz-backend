const { execSync } = require('child_process');
const fs = require('fs');

console.log('🔍 Testando compilação TypeScript...');

try {
  // Verificar se as correções foram aplicadas
  const enhancedAiRoutes = fs.readFileSync('src/routes/enhanced-ai.routes.ts', 'utf8');
  const hasCorrectImport = enhancedAiRoutes.includes('import { authenticateToken as auth }');
  
  console.log('✅ Verificação de importações:', hasCorrectImport ? 'OK' : 'FALHOU');
  
  const chatTypes = fs.readFileSync('src/types/chat.types.ts', 'utf8');
  const hasEnhancedAI = chatTypes.includes('enhancedAIEnabled');
  const hasAiCapabilities = chatTypes.includes('aiCapabilities');
  
  console.log('✅ Verificação de tipos chat:', hasEnhancedAI && hasAiCapabilities ? 'OK' : 'FALHOU');
  
  const queueService = fs.readFileSync('src/services/queue.service.ts', 'utf8');
  const hasCorrectTimeout = queueService.includes('NodeJS.Timeout | null');
  
  console.log('✅ Verificação de queue service:', hasCorrectTimeout ? 'OK' : 'FALHOU');
  
  // Tentar compilar usando tsc diretamente
  console.log('\n📦 Executando compilação TypeScript...');
  
  try {
    const output = execSync('npx tsc --noEmit --skipLibCheck', { 
      encoding: 'utf8', 
      stdio: 'pipe',
      timeout: 30000 
    });
    console.log('✅ Compilação TypeScript bem-sucedida!');
    console.log(output);
  } catch (compileError) {
    console.log('❌ Erro na compilação TypeScript:');
    console.log(compileError.stdout || compileError.message);
  }
  
} catch (error) {
  console.error('❌ Erro durante verificação:', error.message);
}