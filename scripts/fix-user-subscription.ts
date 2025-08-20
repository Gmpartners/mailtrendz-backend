#!/usr/bin/env node

/**
 * Script para corrigir problemas de sincronização de assinatura
 * 
 * Uso:
 * npm run fix-subscription
 * ou
 * npx tsx scripts/fix-user-subscription.ts
 */

import dotenv from 'dotenv'

dotenv.config()

const USER_ID = 'e0ebd2e9-5e5c-49cb-a804-f9db7878e135'
const CUSTOMER_ID = 'cus_SfmwhGgsR4WJU4'
const SUBSCRIPTION_ID = 'sub_1RkRN7LIDpwN7e9FUYDAZElQ'

async function fixUserSubscription() {
  console.log('🔧 CORRIGINDO ASSINATURA DO USUÁRIO')
  console.log('====================================\n')

  try {
    const { supabaseAdmin } = await import('../src/config/supabase.config')

    // 1. Verificar estado atual
    console.log('1. 📊 Verificando estado atual...')
    const { data: currentSub, error: currentError } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', USER_ID)
      .single()

    if (currentError) {
      console.log('❌ Erro ao buscar assinatura atual:', currentError.message)
    } else {
      console.log('✅ Assinatura atual encontrada:')
      console.log(`   Plan: ${currentSub.plan_type}`)
      console.log(`   Status: ${currentSub.status}`)
      console.log(`   Customer ID: ${currentSub.stripe_customer_id}`)
      console.log(`   Subscription ID: ${currentSub.stripe_subscription_id}`)
      console.log(`   Período: ${currentSub.current_period_start} - ${currentSub.current_period_end}`)
    }

    // 2. Verificar se expirou
    const now = new Date()
    const periodEnd = new Date(currentSub.current_period_end)
    const expired = now > periodEnd
    
    console.log(`\n2. ⏰ Verificação de expiração:`)
    console.log(`   Agora: ${now.toISOString()}`)
    console.log(`   Fim do período: ${periodEnd.toISOString()}`)
    console.log(`   Status: ${expired ? '❌ EXPIRADA' : '✅ ATIVA'}`)
    
    if (expired) {
      console.log(`   Dias em atraso: ${Math.ceil((now.getTime() - periodEnd.getTime()) / (1000 * 60 * 60 * 24))}`)
    }

    // 3. Atualizar status se necessário
    if (expired && currentSub.status === 'active') {
      console.log('\n3. 🔄 Atualizando status da assinatura...')
      
      const { error: updateError } = await supabaseAdmin
        .from('subscriptions')
        .update({
          status: 'past_due',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', USER_ID)

      if (updateError) {
        console.log('❌ Erro ao atualizar status:', updateError.message)
      } else {
        console.log('✅ Status atualizado para "past_due"')
      }
    } else {
      console.log('\n3. ✅ Status da assinatura correto')
    }

    // 4. Verificar créditos
    console.log('\n4. 💳 Verificando créditos atuais...')
    const { data: usage, error: usageError } = await supabaseAdmin
      .from('user_monthly_usage')
      .select('*')
      .eq('user_id', USER_ID)
      .order('created_at', { ascending: false })
      .limit(1)

    if (usageError) {
      console.log('❌ Erro ao buscar usage:', usageError.message)
    } else if (usage && usage.length > 0) {
      const u = usage[0]
      console.log('✅ Usage atual:')
      console.log(`   Período: ${u.period_start} - ${u.period_end}`)
      console.log(`   Usado: ${u.requests_used}`)
      console.log(`   Última atualização: ${u.updated_at}`)
    } else {
      console.log('⚠️  Nenhum usage encontrado')
    }

    // 5. Opção de renovar manualmente se necessário
    if (expired) {
      console.log('\n5. 🔄 OPÇÕES DE CORREÇÃO:')
      console.log('=======================\n')
      console.log('OPÇÃO A: Renovar créditos manualmente (para teste):')
      console.log('   npm run renew-credits\n')
      console.log('OPÇÃO B: Configurar webhook e esperar próxima cobrança')
      console.log('OPÇÃO C: Simular pagamento bem-sucedido via webhook')
      
      // Renovar automaticamente para desenvolvimento
      console.log('\n🚀 Renovando créditos automaticamente (modo desenvolvimento)...')
      
      const { error: renewError } = await supabaseAdmin.rpc('initialize_user_credits', {
        p_user_id: USER_ID,
        p_plan_type: 'enterprise' as 'free' | 'starter' | 'enterprise' | 'unlimited'
      })

      if (renewError) {
        console.log('❌ Erro na renovação:', renewError.message)
      } else {
        console.log('✅ Créditos renovados com sucesso!')
        
        // Atualizar status para active
        await supabaseAdmin
          .from('subscriptions')
          .update({
            status: 'active',
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(), // +30 dias
            updated_at: new Date().toISOString()
          })
          .eq('user_id', USER_ID)
          
        console.log('✅ Status da assinatura atualizado para ativo')
      }
    } else {
      console.log('\n5. ✅ Assinatura está ativa, nenhuma ação necessária')
    }

    console.log('\n✅ Correção concluída!')
    console.log('\n📋 RESUMO:')
    console.log('==========')
    console.log('• Configure o webhook no Stripe Dashboard para futuras renovações')
    console.log('• Use Stripe CLI para testar webhooks localmente')
    console.log('• Monitore logs para verificar se webhooks estão chegando')

  } catch (error: any) {
    console.error('❌ Erro na correção:', error.message)
    process.exit(1)
  }
}

if (require.main === module) {
  fixUserSubscription()
}