require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
)

async function testAuthMiddleware() {
  console.log('🔍 Testando middleware de autenticação...\n')
  
  // Simular um token JWT válido
  console.log('1. Criando usuário de teste...')
  
  // Criar usuário via Auth API
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: 'test@mailtrendz.com',
    password: 'testpassword123',
    email_confirm: true
  })
  
  if (authError) {
    console.log(`❌ Erro ao criar usuário: ${authError.message}`)
    return
  }
  
  console.log(`✅ Usuário criado: ${authData.user.email}`)
  
  // 2. Criar profile para o usuário
  console.log('\n2. Criando profile...')
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .insert({
      id: authData.user.id,
      email: authData.user.email,
      name: 'Test User',
      subscription: 'free'
    })
    .select()
    .single()
    
  if (profileError) {
    console.log(`❌ Erro ao criar profile: ${profileError.message}`)
  } else {
    console.log(`✅ Profile criado: ${profile.email}`)
  }
  
  // 3. Criar user_subscription_info
  console.log('\n3. Criando user_subscription_info...')
  const { data: subInfo, error: subError } = await supabase
    .from('user_subscription_info')
    .insert({
      user_id: authData.user.id,
      plan_type: 'free',
      plan_credits: 3,
      credits_used: 0,
      max_projects: 10
    })
    .select()
    .single()
    
  if (subError) {
    console.log(`❌ Erro ao criar user_subscription_info: ${subError.message}`)
  } else {
    console.log(`✅ User subscription info criado`)
  }
  
  // 4. Gerar token JWT
  console.log('\n4. Gerando token JWT...')
  const { data: session, error: sessionError } = await supabase.auth.admin.generateLink({
    type: 'signup',
    email: authData.user.email
  })
  
  if (sessionError) {
    console.log(`❌ Erro ao gerar token: ${sessionError.message}`)
  } else {
    console.log(`✅ Token gerado (primeira parte): ${session.properties?.access_token?.substring(0, 50)}...`)
  }
  
  // 5. Testar validação do token
  console.log('\n5. Testando validação do token...')
  const { data: user, error: validateError } = await supabase.auth.getUser()
  
  if (validateError) {
    console.log(`❌ Erro na validação: ${validateError.message}`)
  } else {
    console.log(`✅ Token válido para: ${user.user?.email}`)
  }
  
  // 6. Testar função check_project_limit
  console.log('\n6. Testando check_project_limit...')
  const { data: canCreate, error: limitError } = await supabase.rpc('check_project_limit', {
    p_user_id: authData.user.id
  })
  
  if (limitError) {
    console.log(`❌ Erro na função check_project_limit: ${limitError.message}`)
  } else {
    console.log(`✅ check_project_limit: ${canCreate ? 'PERMITIDO' : 'BLOQUEADO'}`)
  }
  
  console.log(`\nℹ️  User ID para teste: ${authData.user.id}`)
  console.log(`ℹ️  Email para teste: ${authData.user.email}`)
}

testAuthMiddleware()
  .then(() => {
    console.log('\n✅ Teste concluído!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Erro no teste:', error)
    process.exit(1)
  })
