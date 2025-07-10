const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://kuhlihvgocoxscouzmeg.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1aGxpaHZnb2NveHNjb3V6bWVnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTEyOTA2NSwiZXhwIjoyMDY2NzA1MDY1fQ._JM-em-4bl8PMpjaNJKUFzenCaMsv2gcNmuej6inmPE'
)

async function checkAndFixCredits() {
  console.log('🔍 Verificando usuários sem créditos...')
  
  try {
    // Buscar todos os profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, subscription')
    
    if (profilesError) {
      console.error('❌ Erro ao buscar profiles:', profilesError)
      return
    }

    console.log(`📊 Encontrados ${profiles.length} usuários`)

    for (const profile of profiles) {
      console.log(`\n👤 Verificando usuário: ${profile.email} (${profile.id})`)
      
      // Verificar se tem créditos
      const { data: credits, error: creditsError } = await supabase
        .from('ai_credits')
        .select('*')
        .eq('user_id', profile.id)
        .single()
      
      if (creditsError && creditsError.code === 'PGRST116') {
        // Usuário sem créditos - inicializar
        console.log(`⚠️  Usuário ${profile.email} sem créditos. Inicializando...`)
        
        const { data: result, error: initError } = await supabase.rpc('initialize_user_credits', {
          p_user_id: profile.id,
          p_plan_type: profile.subscription || 'free'
        })
        
        if (initError) {
          console.error(`❌ Erro ao inicializar créditos para ${profile.email}:`, initError)
        } else {
          console.log(`✅ Créditos inicializados para ${profile.email}`)
        }
      } else if (creditsError) {
        console.error(`❌ Erro ao verificar créditos para ${profile.email}:`, creditsError)
      } else {
        console.log(`✅ ${profile.email} já tem créditos: ${credits.credits_available}/${credits.credits_total}`)
      }
    }

    console.log('\n🎉 Verificação concluída!')
    
  } catch (error) {
    console.error('❌ Erro geral:', error)
  }
}

async function checkSpecificUser(userId) {
  console.log(`🔍 Verificando usuário específico: ${userId}`)
  
  try {
    // Buscar profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    
    if (profileError) {
      console.error('❌ Erro ao buscar profile:', profileError)
      return
    }

    console.log('👤 Profile:', profile)

    // Buscar créditos
    const { data: credits, error: creditsError } = await supabase
      .from('ai_credits')
      .select('*')
      .eq('user_id', userId)
      .single()
    
    if (creditsError) {
      console.error('❌ Erro ao buscar créditos:', creditsError)
    } else {
      console.log('💎 Créditos:', credits)
    }

    // Buscar view de subscription info
    const { data: subInfo, error: subError } = await supabase
      .from('user_subscription_info')
      .select('*')
      .eq('user_id', userId)
      .single()
    
    if (subError) {
      console.error('❌ Erro ao buscar subscription info:', subError)
    } else {
      console.log('📋 Subscription Info:', subInfo)
    }

  } catch (error) {
    console.error('❌ Erro:', error)
  }
}

// Se um userId foi passado como argumento, verificar só esse usuário
const userId = process.argv[2]
if (userId) {
  checkSpecificUser(userId)
} else {
  checkAndFixCredits()
}
