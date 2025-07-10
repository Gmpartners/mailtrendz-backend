require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
)

async function checkRealUsers() {
  console.log('🔍 Verificando usuários reais...\n')
  
  // 1. Verificar usuários nos profiles
  console.log('1. Usuários nos profiles...')
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, email, name, subscription')
    .limit(5)
    
  if (profilesError) {
    console.log(`❌ Erro ao buscar profiles: ${profilesError.message}`)
  } else {
    console.log(`✅ Encontrados ${profiles.length} usuários nos profiles:`)
    profiles.forEach((p, i) => {
      console.log(`   ${i+1}. ${p.email} (${p.subscription}) - ID: ${p.id}`)
    })
  }
  
  // 2. Verificar user_subscription_info
  console.log('\n2. Verificando user_subscription_info...')
  const { data: subInfos, error: subError } = await supabase
    .from('user_subscription_info')
    .select('user_id, plan_type, max_projects, credits_used, plan_credits')
    .limit(5)
    
  if (subError) {
    console.log(`❌ Erro ao buscar user_subscription_info: ${subError.message}`)
  } else {
    console.log(`✅ Encontrados ${subInfos.length} registros em user_subscription_info:`)
    subInfos.forEach((s, i) => {
      console.log(`   ${i+1}. ${s.user_id} - ${s.plan_type} (${s.max_projects} proj max, ${s.credits_used}/${s.plan_credits} créditos)`)
    })
  }
  
  // 3. Se tiver usuários, testar com um usuário real
  if (profiles && profiles.length > 0) {
    const testUser = profiles[0]
    console.log(`\n3. Testando com usuário real: ${testUser.email}`)
    
    // Testar função check_project_limit
    const { data: canCreate, error: limitError } = await supabase.rpc('check_project_limit', {
      p_user_id: testUser.id
    })
    
    if (limitError) {
      console.log(`❌ Erro na função check_project_limit: ${limitError.message}`)
    } else {
      console.log(`✅ Função check_project_limit: ${canCreate ? 'PERMITIDO' : 'BLOQUEADO'}`)
    }
    
    // Contar projetos atuais
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id, name', { count: 'exact' })
      .eq('user_id', testUser.id)
      
    if (projectsError) {
      console.log(`❌ Erro ao contar projetos: ${projectsError.message}`)
    } else {
      console.log(`✅ Projetos atuais: ${projects.length}`)
      if (projects.length > 0) {
        console.log(`   Projetos: ${projects.map(p => p.name).join(', ')}`)
      }
    }
  }
}

checkRealUsers()
  .then(() => {
    console.log('\n✅ Verificação concluída!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Erro na verificação:', error)
    process.exit(1)
  })
