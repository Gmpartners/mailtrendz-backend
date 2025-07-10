import { supabase } from '../src/config/supabase.config'
import { logger } from '../src/utils/logger'

async function initializeCreditsForExistingUsers() {
  try {
    console.log('🚀 Iniciando inicialização de créditos para usuários existentes...')

    // Buscar todos os usuários
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id, email, subscription')

    if (usersError) {
      throw usersError
    }

    if (!users || users.length === 0) {
      console.log('Nenhum usuário encontrado.')
      return
    }

    console.log(`📊 ${users.length} usuários encontrados.`)

    let successCount = 0
    let errorCount = 0

    // Processar cada usuário
    for (const user of users) {
      try {
        // Verificar se já tem créditos
        const { data: existingCredits } = await supabase
          .from('ai_credits')
          .select('id')
          .eq('user_id', user.id)
          .single()

        if (existingCredits) {
          console.log(`⏭️  Usuário ${user.email} já possui créditos.`)
          continue
        }

        // Inicializar créditos
        const { error: initError } = await supabase.rpc('initialize_user_credits', {
          p_user_id: user.id,
          p_plan_type: user.subscription || 'free'
        })

        if (initError) {
          throw initError
        }

        console.log(`✅ Créditos inicializados para ${user.email} (${user.subscription})`)
        successCount++
      } catch (error: any) {
        console.error(`❌ Erro ao inicializar créditos para ${user.email}:`, error.message)
        errorCount++
      }
    }

    console.log('\n📊 Resumo da inicialização:')
    console.log(`✅ Sucesso: ${successCount}`)
    console.log(`❌ Erros: ${errorCount}`)
    console.log(`⏭️  Ignorados: ${users.length - successCount - errorCount}`)

  } catch (error: any) {
    logger.error('Erro fatal na inicialização de créditos:', error)
    console.error('❌ Erro fatal:', error.message)
    process.exit(1)
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  initializeCreditsForExistingUsers()
    .then(() => {
      console.log('✅ Processo concluído!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Erro:', error)
      process.exit(1)
    })
}

export { initializeCreditsForExistingUsers }