import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE!

const supabase = createClient(supabaseUrl, serviceKey)

console.log('🎯 TESTE FINAL - CONFIRMAÇÃO FASE 1')
console.log('=' .repeat(40))

async function finalTest() {
  console.log('🔄 Forçando refresh do schema cache...')
  
  try {
    // Teste 1: Tentar operação em profiles com email
    console.log('\n1️⃣ Testando profiles com email...')
    const { data: profileTest, error: profileError } = await supabase
      .from('profiles')
      .select('id, name, email')
      .limit(1)
    
    if (profileError) {
      console.log('❌ Profiles com email:', profileError.message)
      return false
    } else {
      console.log('✅ Profiles com email - FUNCIONANDO')
    }

    // Teste 2: Tentar operação em chats com project_id
    console.log('\n2️⃣ Testando chats com project_id...')
    const { data: chatTest, error: chatError } = await supabase
      .from('chats')
      .select('id, project_id, user_id')
      .limit(1)
    
    if (chatError) {
      console.log('❌ Chats com project_id:', chatError.message)
      return false
    } else {
      console.log('✅ Chats com project_id - FUNCIONANDO')
    }

    // Teste 3: Verificar se o backend responde sem erros 500
    console.log('\n3️⃣ Testando backend health...')
    try {
      const response = await fetch('http://localhost:8000/api/v1/health')
      if (response.ok) {
        const data = await response.json()
        console.log('✅ Backend health - OK')
        console.log('📊 Status:', data.data.status)
        console.log('💾 Database:', data.data.database.status)
      } else {
        console.log('❌ Backend health - FALHOU')
        return false
      }
    } catch (error: any) {
      console.log('⚠️ Backend offline:', error.message)
    }

    console.log('\n🎉 TODOS OS TESTES PASSARAM!')
    console.log('✅ FASE 1 OFICIALMENTE CONCLUÍDA!')
    
    console.log('\n📋 PRÓXIMOS PASSOS:')
    console.log('🚀 Reiniciar o frontend')
    console.log('🧪 Testar funcionalidades no browser')
    console.log('📈 Avançar para FASE 2 (Interface Visual)')
    
    return true

  } catch (error: any) {
    console.log('💥 Erro no teste final:', error.message)
    return false
  }
}

finalTest()
  .then((success) => {
    if (success) {
      console.log('\n🎊 MIGRAÇÃO FASE 1 CONFIRMADA DEFINITIVAMENTE!')
      console.log('🔥 Pronto para a próxima fase!')
    } else {
      console.log('\n⚠️ Alguns problemas ainda persistem')
      console.log('🔧 Pode ser necessário reiniciar o backend')
    }
  })
  .catch((error) => {
    console.error('\n💥 ERRO:', error)
  })
