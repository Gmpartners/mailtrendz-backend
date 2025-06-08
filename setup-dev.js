#!/usr/bin/env node

const fs = require('fs');
const { exec } = require('child_process');
const path = require('path');

console.log('🚀 Configurando ambiente de desenvolvimento MailTrendz...\n');

// Função para executar comandos
function runCommand(command, description) {
  return new Promise((resolve, reject) => {
    console.log(`📋 ${description}...`);
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ Erro: ${error.message}`);
        reject(error);
        return;
      }
      if (stderr) {
        console.warn(`⚠️  ${stderr}`);
      }
      if (stdout) {
        console.log(stdout);
      }
      resolve(stdout);
    });
  });
}

// Função para copiar arquivo .env
function setupEnvironment() {
  console.log('📝 Configurando variáveis de ambiente...');
  
  if (fs.existsSync('.env.local')) {
    if (!fs.existsSync('.env') || process.argv.includes('--force')) {
      fs.copyFileSync('.env.local', '.env');
      console.log('✅ Arquivo .env atualizado com configuração local');
    } else {
      console.log('ℹ️  Arquivo .env já existe. Use --force para sobrescrever');
    }
  } else {
    console.log('❌ Arquivo .env.local não encontrado');
  }
}

// Função principal
async function setup() {
  try {
    // 1. Configurar .env
    setupEnvironment();
    
    // 2. Verificar se Docker está rodando
    console.log('\n🐳 Verificando Docker...');
    try {
      await runCommand('docker --version', 'Verificando versão do Docker');
      await runCommand('docker-compose --version', 'Verificando Docker Compose');
    } catch (error) {
      console.log('⚠️  Docker não encontrado. Instalação manual do MongoDB será necessária.');
      return;
    }
    
    // 3. Iniciar MongoDB com Docker
    console.log('\n📦 Iniciando MongoDB local...');
    try {
      await runCommand('docker-compose up -d mongodb', 'Iniciando container MongoDB');
      console.log('✅ MongoDB iniciado com sucesso!');
      
      // Aguardar MongoDB inicializar
      console.log('⏳ Aguardando MongoDB inicializar (10s)...');
      await new Promise(resolve => setTimeout(resolve, 10000));
      
    } catch (error) {
      console.log('❌ Erro ao iniciar MongoDB via Docker');
      throw error;
    }
    
    // 4. Testar conexão
    console.log('\n🔍 Testando conexão com banco de dados...');
    try {
      await runCommand('node -e "' +
        'const { MongoClient } = require(\\"mongodb\\"); ' +
        'const uri = \\"mongodb://admin:password123@localhost:27017/mailtrendz?authSource=admin\\"; ' +
        'MongoClient.connect(uri).then(() => { ' +
          'console.log(\\"✅ Conexão com MongoDB bem-sucedida!\\"); ' +
          'process.exit(0); ' +
        '}).catch(err => { ' +
          'console.error(\\"❌ Erro na conexão:\\", err.message); ' +
          'process.exit(1); ' +
        '});' +
      '"', 'Testando conexão MongoDB');
    } catch (error) {
      console.log('❌ Falha na conexão com MongoDB');
    }
    
    // 5. Instalar dependências se necessário
    if (!fs.existsSync('node_modules')) {
      console.log('\n📦 Instalando dependências...');
      await runCommand('npm install', 'Instalando pacotes npm');
    }
    
    console.log('\n🎉 Configuração concluída!');
    console.log('\n📋 Próximos passos:');
    console.log('   1. Execute: npm run dev');
    console.log('   2. Acesse: http://localhost:8000');
    console.log('   3. API Health: http://localhost:8000/health');
    console.log('\n🛠️  Comandos úteis:');
    console.log('   • docker-compose logs mongodb  # Ver logs do MongoDB');
    console.log('   • docker-compose stop mongodb  # Parar MongoDB');
    console.log('   • docker-compose restart mongodb  # Reiniciar MongoDB');
    
  } catch (error) {
    console.error('\n❌ Erro durante a configuração:', error.message);
    console.log('\n🔧 Configuração manual necessária:');
    console.log('   1. Instale Docker e Docker Compose');
    console.log('   2. Execute: docker-compose up -d mongodb');
    console.log('   3. Copie .env.local para .env');
    console.log('   4. Execute: npm run dev');
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  setup();
}

module.exports = { setup };
