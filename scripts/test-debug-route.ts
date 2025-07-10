import axios from 'axios'
import dotenv from 'dotenv'
dotenv.config()

const API_BASE = 'http://localhost:8000/api/v1'

async function testProjectCreationDebug() {
  console.log('🔍 Testando criação de projeto com rota de debug...\n')

  try {
    console.log('📤 Testando validação e criação...')
    
    const projectData = {
      prompt: 'Crie um email promocional para uma loja de roupas',
      type: 'campaign',
      industry: 'fashion',
      targetAudience: 'jovens adultos',
      tone: 'casual'
    }

    console.log('Data enviada:', JSON.stringify(projectData, null, 2))

    // Tentar criar projeto usando rota de debug
    const projectResponse = await axios.post(
      `${API_BASE}/projects-debug/test-create`,
      projectData,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )

    console.log('✅ Projeto criado com sucesso:', projectResponse.data)
    
  } catch (error: any) {
    console.log('❌ Erro:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    })
    
    // Se o erro for de validação, mostrar detalhes
    if (error.response?.status === 400) {
      console.log('\n📝 Detalhes da validação:')
      console.log(JSON.stringify(error.response.data, null, 2))
    }
    
    // Se o erro for 403, mostrar detalhes do limite
    if (error.response?.status === 403) {
      console.log('\n🚫 Detalhes do erro 403:')
      console.log(JSON.stringify(error.response.data, null, 2))
    }
  }
}

// Executar teste
testProjectCreationDebug().catch(console.error)
