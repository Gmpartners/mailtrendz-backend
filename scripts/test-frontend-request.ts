import axios from 'axios'
import dotenv from 'dotenv'
dotenv.config()

async function testFrontendProjectCreation() {
  console.log('🔍 Testando criação de projeto como frontend...\n')

  // Dados que o frontend normalmente enviaria
  const projectData = {
    prompt: 'Crie um email promocional para uma loja de roupas',
    type: 'campaign',
    industry: 'fashion',
    targetAudience: 'jovens adultos',
    tone: 'casual'
  }

  // Token de teste - você precisa ter um token válido
  const token = process.env.TEST_USER_TOKEN || 'seu-token-aqui'

  try {
    console.log('📤 Enviando requisição para o backend...')
    console.log('Data:', JSON.stringify(projectData, null, 2))
    
    const response = await axios.post(
      'http://localhost:8000/api/v1/projects',
      projectData,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    )

    console.log('✅ Sucesso:', response.data)
  } catch (error: any) {
    console.log('❌ Erro:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    })
  }
}

// Teste alternativo: verificar se o servidor está rodando
async function testServerHealth() {
  console.log('🔍 Testando se o servidor está rodando...\n')
  
  try {
    const response = await axios.get('http://localhost:8000/health')
    console.log('✅ Servidor rodando:', response.data)
  } catch (error: any) {
    console.log('❌ Servidor não está rodando:', error.message)
  }
}

// Teste de endpoint público
async function testPublicEndpoint() {
  console.log('🔍 Testando endpoint público...\n')
  
  try {
    const response = await axios.get('http://localhost:8000/api/v1/projects/health')
    console.log('✅ Endpoint público funcionando:', response.data)
  } catch (error: any) {
    console.log('❌ Endpoint público erro:', {
      status: error.response?.status,
      message: error.message
    })
  }
}

// Executar todos os testes
async function runAllTests() {
  await testServerHealth()
  await testPublicEndpoint()
  await testFrontendProjectCreation()
}

runAllTests().catch(console.error)
