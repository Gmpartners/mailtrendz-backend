require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
)

async function debugProjectCreation() {
  console.log('🔍 Debugando criação de projeto...\n')
  
  // Simular um usuário existente
  const testUserId = '123e4567-e89b-12d3-a456-426614174000'
  
  // 1. Verificar se o usuário existe nos profiles
  console.log('1. Verificando usuário nos profiles...')
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', testUserId)
    .single()
    
  if (profileError) {
    console.log(`❌ Usuário não encontrado nos profiles: ${profileError.message}`)
    
    // Criar usuário de teste
    console.log('   Criando usuário de teste...')
    const { data: newProfile, error: createError } = await supabase
      .from('profiles')
      .insert({
        id: testUserId,
        name: 'Test User',
        email: 'test@example.com',
        subscription: 'free'
      })
      .select()
      .single()
      
    if (createError) {
      console.log(`❌ Erro ao criar usuário: ${createError.message}`)
      return
    } else {
      console.log(`✅ Usuário criado: ${newProfile.email}`)
    }
  } else {
    console.log(`✅ Usuário encontrado: ${profile.email} (${profile.subscription})`)
  }
  
  // 2. Verificar user_subscription_info
  console.log('\n2. Verificando user_subscription_info...')
  const { data: subInfo, error: subError } = await supabase
    .from('user_subscription_info')
    .select('*')
    .eq('user_id', testUserId)
    .single()
    
  if (subError) {
    console.log(`❌ Usuário não encontrado em user_subscription_info: ${subError.message}`)
    
    // Criar registro de subscription info
    console.log('   Criando registro de subscription info...')
    const { data: newSubInfo, error: createSubError } = await supabase
      .from('user_subscription_info')
      .insert({
        user_id: testUserId,
        plan_type: 'free',
        plan_credits: 3,
        credits_used: 0,
        max_projects: 3
      })
      .select()
      .single()
      
    if (createSubError) {
      console.log(`❌ Erro ao criar subscription info: ${createSubError.message}`)
    } else {
      console.log(`✅ Subscription info criado`)
    }
  } else {
    console.log(`✅ Subscription info encontrado: ${subInfo.plan_type} (${subInfo.max_projects} projetos max)`)
  }
  
  // 3. Testar função check_project_limit
  console.log('\n3. Testando função check_project_limit...')
  const { data: canCreate, error: limitError } = await supabase.rpc('check_project_limit', {
    p_user_id: testUserId
  })
  
  if (limitError) {
    console.log(`❌ Erro na função check_project_limit: ${limitError.message}`)
  } else {
    console.log(`✅ Função check_project_limit: ${canCreate ? 'PERMITIDO' : 'BLOQUEADO'}`)
  }
  
  // 4. Contar projetos atuais
  console.log('\n4. Contando projetos atuais...')
  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('id', { count: 'exact' })
    .eq('user_id', testUserId)
    
  if (projectsError) {
    console.log(`❌ Erro ao contar projetos: ${projectsError.message}`)
  } else {
    console.log(`✅ Projetos atuais: ${projects.length}`)
  }
  
  // 5. Verificar plan_features
  console.log('\n5. Verificando plan_features...')
  const { data: planFeatures, error: planError } = await supabase
    .from('plan_features')
    .select('*')
    .eq('plan_type', 'free')
    .single()
    
  if (planError) {
    console.log(`❌ Erro ao buscar plan_features: ${planError.message}`)
  } else {
    console.log(`✅ Plan features: max_projects=${planFeatures.max_projects}`)
  }
  
  // 6. Testar criação de projeto
  console.log('\n6. Testando criação de projeto...')
  const { data: newProject, error: createProjectError } = await supabase
    .from('projects')
    .insert({
      user_id: testUserId,
      name: 'Test Project',
      description: 'Test Description',
      content: {
        html: '<p>Test HTML</p>',
        text: 'Test Text',
        subject: 'Test Subject',
        previewText: 'Test Preview'
      },
      metadata: {
        industry: 'test',
        targetAudience: 'test',
        tone: 'test',
        originalPrompt: 'test',
        version: 1
      }
    })
    .select()
    .single()
    
  if (createProjectError) {
    console.log(`❌ Erro ao criar projeto: ${createProjectError.message}`)
  } else {
    console.log(`✅ Projeto criado: ${newProject.name}`)
  }
}

debugProjectCreation()
  .then(() => {
    console.log('\n✅ Debug concluído!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Erro no debug:', error)
    process.exit(1)
  })
