import axios from 'axios'
import dotenv from 'dotenv'
dotenv.config()

const API_BASE = 'http://localhost:8000/api/v1'

// Teste alternativo: registrar novo usuário e tentar criar projeto
async function testWithNewUser() {
  console.log('🔍 Testando com novo usuário...\n')

  try {
    const timestamp = Date.now()
    const testUser = {
      email: `test${timestamp}@test.com`,
      password: 'TestPassword123!',
      confirmPassword: 'TestPassword123!',
      name: 'Test User'
    }

    console.log('📝 Registrando novo usuário...')
    
    const registerResponse = await axios.post(`${API_BASE}/auth/register`, testUser)
    
    if (registerResponse.data.success) {
      console.log('✅ Usuário registrado:', registerResponse.data.data.user.email)
      
      // Tentar fazer login
      console.log('🔐 Fazendo login...')
      
      const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
        email: testUser.email,
        password: testUser.password
      })
      
      const token = loginResponse.data.data.token
      console.log('✅ Login bem-sucedido')
      
      // Tentar criar projeto
      console.log('📤 Criando projeto...')
      
      const projectData = {
        prompt: 'Crie um email promocional para uma loja de roupas',
        type: 'campaign',
        industry: 'fashion',
        targetAudience: 'jovens adultos',
        tone: 'casual'
      }

      const projectResponse = await axios.post(
        `${API_BASE}/projects`,
        projectData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      )

      console.log('✅ Projeto criado com sucesso:', projectResponse.data)
    }
    
  } catch (error: any) {
    console.log('❌ Erro:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    })
  }
}

// Executar teste
testWithNewUser().catch(console.error)
