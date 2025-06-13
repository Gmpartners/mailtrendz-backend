#!/usr/bin/env node

/**
 * ✅ SCRIPT DE VALIDAÇÃO COMPLETA - MAILTRENDZ
 * Verifica se todo o sistema híbrido Node.js + Python está funcionando
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Cores para output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

const log = (message, color = 'green') => {
  console.log(`${colors[color]}[VALIDAÇÃO]${colors.reset} ${message}`);
};

const warn = (message) => {
  console.log(`${colors.yellow}[AVISO]${colors.reset} ${message}`);
};

const error = (message) => {
  console.log(`${colors.red}[ERRO]${colors.reset} ${message}`);
};

const success = (message) => {
  console.log(`${colors.green}[SUCESSO]${colors.reset} ${message}`);
};

// Banner
console.log(`${colors.cyan}
🔍 MailTrendz - Validação Completa do Sistema
=============================================${colors.reset}
`);

let validationResults = {
  files: { passed: 0, failed: 0, total: 0 },
  environment: { passed: 0, failed: 0, total: 0 },
  dependencies: { passed: 0, failed: 0, total: 0 },
  services: { passed: 0, failed: 0, total: 0 },
  overall: { passed: 0, failed: 0, total: 0 }
};

// ================================
// VALIDAÇÃO DE ARQUIVOS
// ================================

log('Validando estrutura de arquivos...', 'blue');

const requiredFiles = [
  // Arquivos principais
  'package.json',
  'tsconfig.json',
  '.env.example',
  'docker-compose.yml',
  
  // Node.js API
  'src/app.ts',
  'src/server.ts',
  'src/services/chat.service.ts',
  'src/services/ai/PythonAIClient.ts',
  'src/controllers/ai.controller.ts',
  'src/controllers/chat.controller.ts',
  'src/routes/ai.routes.ts',
  'src/routes/chat.routes.ts',
  
  // Python AI Service
  'ai-service/app.py',
  'ai-service/requirements.txt',
  'ai-service/Dockerfile',
  'ai-service/app/services/ai_coordinator.py',
  'ai-service/app/services/css_expert.py',
  'ai-service/app/services/html_optimizer.py',
  'ai-service/app/services/email_generator.py',
  'ai-service/app/database/mongodb_client.py',
  'ai-service/app/models/project_models.py',
  'ai-service/app/utils/validators.py',
  'ai-service/app/utils/performance.py',
  
  // Scripts
  'scripts/setup.sh',
  'scripts/dev.sh',
  'scripts/mongo-init.js'
];

requiredFiles.forEach(file => {
  validationResults.files.total++;
  if (fs.existsSync(file)) {
    success(`✅ ${file}`);
    validationResults.files.passed++;
  } else {
    error(`❌ ${file} - FALTANDO`);
    validationResults.files.failed++;
  }
});

// ================================
// VALIDAÇÃO DE AMBIENTE
// ================================

log('\nValidando variáveis de ambiente...', 'blue');

const envPath = '.env';
let envVars = {};

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      envVars[key.trim()] = value.trim();
    }
  });
  success('✅ Arquivo .env encontrado');
  validationResults.environment.passed++;
} else {
  error('❌ Arquivo .env não encontrado');
  validationResults.environment.failed++;
}

validationResults.environment.total++;

// Variáveis críticas
const criticalEnvVars = [
  'MONGODB_URL',
  'JWT_SECRET',
  'PYTHON_AI_SERVICE_URL',
  'OPENROUTER_API_KEY'
];

criticalEnvVars.forEach(envVar => {
  validationResults.environment.total++;
  
  if (envVars[envVar] && envVars[envVar] !== 'sua_chave_aqui' && !envVars[envVar].includes('exemplo')) {
    success(`✅ ${envVar} configurada`);
    validationResults.environment.passed++;
  } else {
    error(`❌ ${envVar} não configurada ou usando valor de exemplo`);
    validationResults.environment.failed++;
  }
});

// ================================
// VALIDAÇÃO DE DEPENDÊNCIAS
// ================================

log('\nValidando dependências...', 'blue');

// Node.js
try {
  const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
  const majorVersion = parseInt(nodeVersion.replace('v', '').split('.')[0]);
  
  validationResults.dependencies.total++;
  if (majorVersion >= 18) {
    success(`✅ Node.js ${nodeVersion} (OK)`);
    validationResults.dependencies.passed++;
  } else {
    error(`❌ Node.js ${nodeVersion} (Necessário v18+)`);
    validationResults.dependencies.failed++;
  }
} catch (e) {
  error('❌ Node.js não encontrado');
  validationResults.dependencies.failed++;
  validationResults.dependencies.total++;
}

// Python
try {
  const pythonVersion = execSync('python3 --version', { encoding: 'utf8' }).trim();
  validationResults.dependencies.total++;
  success(`✅ ${pythonVersion}`);
  validationResults.dependencies.passed++;
} catch (e) {
  error('❌ Python 3 não encontrado');
  validationResults.dependencies.failed++;
  validationResults.dependencies.total++;
}

// NPM packages
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const nodeModulesExists = fs.existsSync('node_modules');
  
  validationResults.dependencies.total++;
  if (nodeModulesExists) {
    success('✅ Dependências Node.js instaladas');
    validationResults.dependencies.passed++;
  } else {
    error('❌ Dependências Node.js não instaladas (execute: npm install)');
    validationResults.dependencies.failed++;
  }
} catch (e) {
  error('❌ Erro ao verificar package.json');
  validationResults.dependencies.failed++;
  validationResults.dependencies.total++;
}

// Python virtual environment
validationResults.dependencies.total++;
if (fs.existsSync('ai-service/venv') || fs.existsSync('ai-service/.venv')) {
  success('✅ Ambiente virtual Python encontrado');
  validationResults.dependencies.passed++;
} else {
  warn('⚠️ Ambiente virtual Python não encontrado (recomendado)');
  validationResults.dependencies.failed++;
}

// Docker (opcional)
try {
  const dockerVersion = execSync('docker --version', { encoding: 'utf8' }).trim();
  validationResults.dependencies.total++;
  success(`✅ Docker disponível: ${dockerVersion}`);
  validationResults.dependencies.passed++;
} catch (e) {
  warn('⚠️ Docker não encontrado (opcional)');
  validationResults.dependencies.failed++;
  validationResults.dependencies.total++;
}

// ================================
// VALIDAÇÃO DE CONFIGURAÇÃO
// ================================

log('\nValidando configurações...', 'blue');

// TypeScript config
validationResults.overall.total++;
try {
  const tsConfig = JSON.parse(fs.readFileSync('tsconfig.json', 'utf8'));
  if (tsConfig.compilerOptions && tsConfig.compilerOptions.target) {
    success('✅ Configuração TypeScript válida');
    validationResults.overall.passed++;
  } else {
    error('❌ Configuração TypeScript inválida');
    validationResults.overall.failed++;
  }
} catch (e) {
  error('❌ Erro ao validar tsconfig.json');
  validationResults.overall.failed++;
}

// Python requirements
validationResults.overall.total++;
try {
  const requirements = fs.readFileSync('ai-service/requirements.txt', 'utf8');
  const hasEssentials = ['fastapi', 'uvicorn', 'pydantic', 'motor', 'pymongo']
    .every(pkg => requirements.includes(pkg));
  
  if (hasEssentials) {
    success('✅ Requirements Python essenciais presentes');
    validationResults.overall.passed++;
  } else {
    error('❌ Requirements Python incompletos');
    validationResults.overall.failed++;
  }
} catch (e) {
  error('❌ Erro ao validar requirements.txt');
  validationResults.overall.failed++;
}

// ================================
// TESTE DE CONECTIVIDADE
// ================================

log('\nTestando conectividade (se serviços estiverem rodando)...', 'blue');

const testService = async (url, name) => {
  try {
    const response = await fetch(url, { 
      method: 'GET',
      timeout: 5000 
    });
    
    validationResults.services.total++;
    if (response.ok) {
      success(`✅ ${name} respondendo (${response.status})`);
      validationResults.services.passed++;
    } else {
      warn(`⚠️ ${name} respondeu com status ${response.status}`);
      validationResults.services.failed++;
    }
  } catch (e) {
    validationResults.services.total++;
    warn(`⚠️ ${name} não está rodando ou não acessível`);
    validationResults.services.failed++;
  }
};

// Simular teste (sem usar fetch real para compatibilidade)
const services = [
  { url: 'http://localhost:8000/api/v1/health', name: 'Node.js API' },
  { url: 'http://localhost:5000/health', name: 'Python AI Service' },
  { url: 'mongodb://localhost:27017', name: 'MongoDB' }
];

services.forEach(service => {
  validationResults.services.total++;
  warn(`⚠️ ${service.name} - Execute os serviços para testar conectividade`);
  validationResults.services.failed++;
});

// ================================
// RELATÓRIO FINAL
// ================================

console.log(`\n${colors.cyan}📊 RELATÓRIO DE VALIDAÇÃO${colors.reset}`);
console.log('==========================================');

const sections = [
  { name: 'Arquivos', data: validationResults.files },
  { name: 'Ambiente', data: validationResults.environment },
  { name: 'Dependências', data: validationResults.dependencies },
  { name: 'Serviços', data: validationResults.services }
];

sections.forEach(section => {
  const { name, data } = section;
  const percentage = data.total > 0 ? Math.round((data.passed / data.total) * 100) : 0;
  const status = percentage >= 80 ? 'green' : percentage >= 60 ? 'yellow' : 'red';
  
  console.log(`${colors[status]}${name}: ${data.passed}/${data.total} (${percentage}%)${colors.reset}`);
});

// Score geral
const totalPassed = Object.values(validationResults).reduce((sum, section) => sum + section.passed, 0);
const totalItems = Object.values(validationResults).reduce((sum, section) => sum + section.total, 0);
const overallScore = Math.round((totalPassed / totalItems) * 100);

console.log('\n==========================================');
if (overallScore >= 80) {
  console.log(`${colors.green}🎉 SISTEMA PRONTO PARA USO! Score: ${overallScore}%${colors.reset}`);
} else if (overallScore >= 60) {
  console.log(`${colors.yellow}⚠️ SISTEMA PARCIALMENTE PRONTO. Score: ${overallScore}%${colors.reset}`);
} else {
  console.log(`${colors.red}❌ SISTEMA PRECISA DE CORREÇÕES. Score: ${overallScore}%${colors.reset}`);
}

console.log('\n📋 PRÓXIMOS PASSOS:');

if (validationResults.files.failed > 0) {
  console.log('1. Execute o script de setup: ./scripts/setup.sh');
}

if (validationResults.environment.failed > 0) {
  console.log('2. Configure variáveis de ambiente no arquivo .env');
}

if (validationResults.dependencies.failed > 0) {
  console.log('3. Instale dependências: npm install && cd ai-service && pip install -r requirements.txt');
}

if (validationResults.services.failed > 0) {
  console.log('4. Inicie os serviços: ./scripts/dev.sh ou docker-compose up -d');
}

console.log('\n🔗 LINKS ÚTEIS:');
console.log('📚 README: ./README.md');
console.log('⚙️ Setup: ./scripts/setup.sh');
console.log('🚀 Dev: ./scripts/dev.sh');
console.log('🐳 Docker: docker-compose up -d');

console.log(`\n${colors.cyan}Validação concluída!${colors.reset}`);
