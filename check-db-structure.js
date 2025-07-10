require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
)

async function checkDBStructure() {
  console.log('🔍 Verificando estrutura do banco de dados...\n')
  
  // Verificar tabelas existentes
  const tables = ['profiles', 'projects', 'user_subscription_info', 'plan_features', 'ai_credits', 'subscriptions']
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1)
        
      if (error) {
        console.log(`❌ Tabela ${table}: ${error.message}`)
      } else {
        console.log(`✅ Tabela ${table}: OK`)
      }
    } catch (err) {
      console.log(`❌ Tabela ${table}: ${err.message}`)
    }
  }
  
  console.log('\n🔍 Verificando funções...')
  
  // Testar função check_project_limit
  try {
    const { data, error } = await supabase.rpc('check_project_limit', {
      p_user_id: '123e4567-e89b-12d3-a456-426614174000'
    })
    
    if (error) {
      console.log(`❌ Função check_project_limit: ${error.message}`)
    } else {
      console.log(`✅ Função check_project_limit: OK`)
    }
  } catch (err) {
    console.log(`❌ Função check_project_limit: ${err.message}`)
  }
  
  console.log('\n🔍 Verificando user_subscription_info...')
  
  // Verificar se view user_subscription_info existe
  try {
    const { data, error } = await supabase
      .from('user_subscription_info')
      .select('*')
      .limit(1)
      
    if (error) {
      console.log(`❌ View user_subscription_info: ${error.message}`)
    } else {
      console.log(`✅ View user_subscription_info: OK`)
    }
  } catch (err) {
    console.log(`❌ View user_subscription_info: ${err.message}`)
  }
}

checkDBStructure()
  .then(() => {
    console.log('\n✅ Verificação concluída!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Erro na verificação:', error)
    process.exit(1)
  })
