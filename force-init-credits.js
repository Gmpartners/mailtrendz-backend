require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
)

async function forceInitializeAllUsers() {
  console.log('🔧 Forçando inicialização de créditos para todos os usuários...')
  
  try {
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, subscription')
    
    if (profilesError) {
      console.error('❌ Erro ao buscar profiles:', profilesError)
      return
    }

    console.log(`📊 Encontrados ${profiles.length} usuários`)

    for (const profile of profiles) {
      console.log(`\n🔄 Reinicializando créditos para: ${profile.email || profile.id}`)
      
      // Forçar inicialização de créditos
      const { data: result, error: initError } = await supabase.rpc('initialize_user_credits', {
        p_user_id: profile.id,
        p_plan_type: profile.subscription || 'free'
      })
      
      if (initError) {
        console.error(`❌ Erro ao inicializar créditos:`, initError)
      } else {
        console.log(`✅ Créditos inicializados com sucesso`)
        
        // Verificar resultado
        const { data: credits, error: creditsError } = await supabase
          .from('ai_credits')
          .select('*')
          .eq('user_id', profile.id)
          .single()
        
        if (!creditsError) {
          console.log(`   💎 Créditos: ${credits.credits_available}/${credits.credits_total}`)
        }
      }
    }

    console.log('\n🎉 Inicialização concluída!')
    
  } catch (error) {
    console.error('❌ Erro geral:', error)
  }
}

forceInitializeAllUsers()
