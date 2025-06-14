const axios = require('axios')

// Possíveis URLs do Railway baseadas no nome do projeto
const possibleUrls = [
  'https://mailtrendz-backend-production.up.railway.app',
  'https://backend-do-mailtrendz-production.up.railway.app',
  'https://mailtrendz-backend.railway.app',
  'https://backend-do-mailtrendz.railway.app',
  'https://mailtrendz-backend.up.railway.app',
  'https://backend-mailtrendz.railway.app'
]

async function findCorrectRailwayUrl() {
  console.log('🔍 Procurando URL correta do Railway...')
  
  for (const url of possibleUrls) {
    try {
      console.log(`🔄 Testando: ${url}`)
      
      const response = await axios.get(`${url}/health`, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Railway-URL-Detector'
        }
      })
      
      if (response.status === 200) {
        console.log(`✅ URL encontrada: ${url}`)
        console.log(`📊 Resposta:`, response.data)
        return url
      }
    } catch (error) {
      console.log(`❌ ${url} - ${error.message}`)
    }
  }
  
  console.log('❌ Nenhuma URL válida encontrada')
  return null
}

async function updateEnvFiles(backendUrl) {
  const fs = require('fs')
  const path = require('path')
  
  console.log('📝 Atualizando arquivos .env...')
  
  // Atualizar backend .env
  const backendEnvPath = path.join(__dirname, '.env')
  if (fs.existsSync(backendEnvPath)) {
    let backendEnv = fs.readFileSync(backendEnvPath, 'utf8')
    
    // Atualizar PYTHON_AI_SERVICE_URL
    backendEnv = backendEnv.replace(
      /PYTHON_AI_SERVICE_URL=.*/,
      `PYTHON_AI_SERVICE_URL=${backendUrl}`
    )
    
    fs.writeFileSync(backendEnvPath, backendEnv)
    console.log('✅ Backend .env atualizado')
  }
  
  // Atualizar frontend .env
  const frontendEnvPath = path.join(__dirname, '../Frontend - MailTrendz/.env')
  if (fs.existsSync(frontendEnvPath)) {
    let frontendEnv = fs.readFileSync(frontendEnvPath, 'utf8')
    
    // Atualizar URLs do frontend
    frontendEnv = frontendEnv.replace(
      /VITE_API_URL=.*/,
      `VITE_API_URL=${backendUrl}/api/v1`
    )
    
    frontendEnv = frontendEnv.replace(
      /VITE_AI_SERVICE_URL=.*/,
      `VITE_AI_SERVICE_URL=${backendUrl}`
    )
    
    fs.writeFileSync(frontendEnvPath, frontendEnv)
    console.log('✅ Frontend .env atualizado')
  }
}

async function main() {
  try {
    const correctUrl = await findCorrectRailwayUrl()
    
    if (correctUrl) {
      await updateEnvFiles(correctUrl)
      console.log('🎉 Configuração atualizada com sucesso!')
      console.log('📋 Próximos passos:')
      console.log('1. Reiniciar o frontend: npm run dev')
      console.log('2. Fazer deploy do backend no Railway')
      console.log('3. Testar a aplicação')
    } else {
      console.log('❌ Não foi possível encontrar a URL do Railway')
      console.log('💡 Verifique se o backend está deployado no Railway')
    }
  } catch (error) {
    console.error('❌ Erro:', error.message)
  }
}

if (require.main === module) {
  main()
}

module.exports = { findCorrectRailwayUrl, updateEnvFiles }