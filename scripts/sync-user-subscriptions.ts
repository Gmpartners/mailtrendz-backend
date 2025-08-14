import { supabase, supabaseAdmin } from '../config/supabase.config'
import { logger } from '../utils/logger'

async function syncUserSubscriptions() {
  try {
    console.log('🔄 Iniciando sincronização de assinaturas...\n')
    
    // 1. Buscar todos os usuários
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, subscription')
      .order('created_at', { ascending: true })
    
    if (profilesError) {
      throw profilesError
    }
    
    console.log(`📊 Total de usuários: ${profiles?.length || 0}\n`)
    
    let syncCount = 0
    let errorCount = 0
    
    for (const profile of profiles || []) {
      try {
        console.log(`\n🔍 Processando usuário: ${profile.email || profile.id}`)
        console.log(`   Plano atual no profile: ${profile.subscription || 'free'}`)
        
        // Verificar se existe registro na tabela subscriptions
        const { data: subscription, error: subError } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', profile.id)
          .single()
        
        if (subError && subError.code !== 'PGRST116') {
          // Se não existe registro, criar um
          if (subError.message?.includes('No rows found')) {
            console.log('   ❌ Sem registro de subscription, criando...')
            
            const { error: insertError } = await supabase
              .from('subscriptions')
              .insert({
                user_id: profile.id,
                plan_type: profile.subscription || 'free',
                status: 'active',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
            
            if (insertError) {
              console.error('   Erro ao criar subscription:', insertError)
              errorCount++
            } else {
              console.log('   ✅ Subscription criada com sucesso')
              syncCount++
            }
          } else {
            console.error('   Erro ao buscar subscription:', subError)
            errorCount++
          }
        } else if (subscription) {
          // Verificar se os planos estão sincronizados
          console.log(`   Plano na subscription: ${subscription.plan_type}`)
          
          if (subscription.plan_type !== profile.subscription) {
            console.log('   ⚠️ Planos divergentes, sincronizando...')
            
            // Atualizar profile com o plano da subscription (subscription é fonte da verdade)
            const { error: updateError } = await supabase
              .from('profiles')
              .update({ 
                subscription: subscription.plan_type,
                updated_at: new Date().toISOString()
              })
              .eq('id', profile.id)
            
            if (updateError) {
              console.error('   Erro ao atualizar profile:', updateError)
              errorCount++
            } else {
              console.log('   ✅ Profile sincronizado com subscription')
              syncCount++
            }
          } else {
            console.log('   ✅ Planos já sincronizados')
          }
        }
        
        // Verificar uso mensal
        const { data: monthlyUsage, error: usageError } = await supabase
          .from('user_monthly_usage')
          .select('*')
          .eq('user_id', profile.id)
          .gte('period_start', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
          .order('created_at', { ascending: false })
        
        if (usageError) {
          console.error('   Erro ao buscar uso mensal:', usageError)
        } else {
          console.log(`   📊 Registros de uso mensal: ${monthlyUsage?.length || 0}`)
          
          // Se houver duplicatas, alertar
          if ((monthlyUsage?.length || 0) > 1) {
            console.log('   ⚠️ ATENÇÃO: Múltiplos registros de uso mensal encontrados!')
            console.log('   Execute o script fix-duplicate-monthly-usage.ts para corrigir')
          }
        }
        
      } catch (err) {
        console.error(`❌ Erro ao processar usuário ${profile.id}:`, err)
        errorCount++
      }
    }
    
    console.log('\n\n📊 RESUMO DA SINCRONIZAÇÃO')
    console.log('================================')
    console.log(`✅ Sincronizados com sucesso: ${syncCount}`)
    console.log(`❌ Erros encontrados: ${errorCount}`)
    console.log(`📊 Total processado: ${profiles?.length || 0}`)
    
    // Estatísticas de planos
    const planStats = {
      free: 0,
      starter: 0,
      enterprise: 0,
      unlimited: 0,
      null: 0
    }
    
    for (const profile of profiles || []) {
      const plan = profile.subscription || 'null'
      planStats[plan as keyof typeof planStats] = (planStats[plan as keyof typeof planStats] || 0) + 1
    }
    
    console.log('\n📊 DISTRIBUIÇÃO DE PLANOS')
    console.log('========================')
    for (const [plan, count] of Object.entries(planStats)) {
      if (count > 0) {
        const percentage = ((count / (profiles?.length || 1)) * 100).toFixed(1)
        console.log(`${plan.padEnd(12)} : ${count.toString().padStart(4)} usuários (${percentage}%)`)
      }
    }
    
  } catch (error) {
    console.error('❌ Erro fatal:', error)
  }
}

// Executar
syncUserSubscriptions()
