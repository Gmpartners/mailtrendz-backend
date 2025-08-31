// Teste da funcionalidade de nomeação de projetos
// Execute com: node test-project-naming.js

const fetch = require('node-fetch');

const API_BASE = 'http://localhost:8000/api/v1';

// Simular autenticação (substitua pelo seu token JWT válido)
const AUTH_TOKEN = 'seu_jwt_token_aqui';

const testCases = [
  {
    name: "Teste 1: Nome fornecido pelo usuário",
    payload: {
      name: "Minha Campanha Black Friday 2024",
      prompt: "Crie um email promocional para Black Friday com 50% de desconto",
      type: "campaign",
      industry: "tecnologia",
      tone: "profissional"
    }
  },
  {
    name: "Teste 2: Nome gerado automaticamente",
    payload: {
      // name não fornecido
      prompt: "Email de boas-vindas para novos usuários da plataforma",
      type: "welcome",
      industry: "tecnologia", 
      tone: "amigavel"
    }
  },
  {
    name: "Teste 3: Nome vazio (deve gerar automaticamente)",
    payload: {
      name: "",
      prompt: "Newsletter semanal com dicas de marketing digital",
      type: "newsletter",
      industry: "marketing",
      tone: "profissional"
    }
  }
];

async function testProjectCreation() {
  console.log('🚀 Iniciando testes de criação de projetos com nomeação...\n');
  
  if (AUTH_TOKEN === 'seu_jwt_token_aqui') {
    console.log('❌ Configure um token JWT válido na variável AUTH_TOKEN');
    console.log('   Você pode obter um token fazendo login no frontend e copiando do localStorage\n');
    return;
  }
  
  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`\n📝 ${testCase.name}`);
    console.log('   Payload:', JSON.stringify(testCase.payload, null, 2));
    
    try {
      const response = await fetch(`${API_BASE}/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AUTH_TOKEN}`
        },
        body: JSON.stringify(testCase.payload)
      });
      
      if (!response.ok) {
        console.log(`   ❌ Erro HTTP: ${response.status}`);
        const errorText = await response.text();
        console.log(`   Resposta: ${errorText.substring(0, 200)}...`);
        continue;
      }
      
      const result = await response.json();
      
      if (result.success) {
        console.log(`   ✅ Projeto criado com sucesso!`);
        console.log(`   📋 Nome final: "${result.data.project.name}"`);
        console.log(`   🆔 ID: ${result.data.project.id}`);
        console.log(`   📧 Tem HTML: ${!!result.data.project.content?.html ? 'Sim' : 'Não'}`);
        console.log(`   📝 Assunto: ${result.data.project.content?.subject || 'N/A'}`);
      } else {
        console.log(`   ❌ Falha na criação: ${result.message || 'Erro desconhecido'}`);
      }
      
    } catch (error) {
      console.log(`   ❌ Erro de rede: ${error.message}`);
    }
    
    // Aguardar entre requests
    if (i < testCases.length - 1) {
      console.log('   ⏳ Aguardando 2s antes do próximo teste...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log('\n🏁 Testes concluídos!\n');
}

// Executar testes
testProjectCreation().catch(console.error);