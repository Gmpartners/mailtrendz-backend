#!/usr/bin/env node

/**
 * Script para testar webhooks do Stripe
 * 
 * Uso:
 * npm run test-webhooks
 * ou
 * npx tsx scripts/test-webhooks.ts
 */

import dotenv from 'dotenv'
import fetch from 'node-fetch'
import Stripe from 'stripe'

dotenv.config()

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-06-30.basil'
})

const API_BASE = process.env.BACKEND_URL_DEV || 'http://localhost:8000'
const USER_ID = 'e0ebd2e9-5e5c-49cb-a804-f9db7878e135' // Seu user ID de teste

async function testWebhookHealth() {
  console.log('🏥 Testando health check do webhook...')
  
  try {
    const response = await fetch(`${API_BASE}/api/v1/webhooks/health`)
    const data = await response.json()
    
    if (response.ok) {
      console.log('✅ Health check OK')
      console.log('   Webhook Secret:', data.data.webhookSecretConfigured ? '✅' : '❌')
      console.log('   Stripe Key:', data.data.stripeKeyConfigured ? '✅' : '❌')
      console.log('   Status:', data.data.status)
    } else {
      console.log('❌ Health check failed:', data.message)
    }
  } catch (error: any) {
    console.log('❌ Erro na conexão:', error.message)
    console.log('   Certifique-se que o backend está rodando na porta 8000')
  }
}

async function testWebhookEndpoint() {
  console.log('\n🎯 Testando endpoint do webhook...')
  
  const testPayload = {
    id: 'evt_test_webhook',
    object: 'event',
    type: 'invoice.payment_succeeded',
    data: {
      object: {
        id: 'in_test_invoice',
        status: 'paid',
        customer: 'cus_test_customer'
      }
    }
  }

  try {
    const response = await fetch(`${API_BASE}/api/v1/webhooks/stripe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Stripe-Signature': 't=123456789,v1=test_signature'
      },
      body: JSON.stringify(testPayload)
    })

    if (response.status === 400) {
      console.log('✅ Endpoint responde corretamente (erro de assinatura esperado)')
    } else {
      const data = await response.json()
      console.log(`⚠️  Status inesperado: ${response.status}`)
      console.log('   Resposta:', JSON.stringify(data, null, 2))
    }
  } catch (error: any) {
    console.log('❌ Erro no teste:', error.message)
  }
}

async function testUserCredits() {
  console.log('\n💳 Testando créditos do usuário...')
  
  try {
    // Verificar estado atual dos créditos
    const { data: currentUsage, error } = await import('../src/config/supabase.config').then(config => 
      config.supabaseAdmin
        .from('user_monthly_usage')
        .select('*')
        .eq('user_id', USER_ID)
        .order('created_at', { ascending: false })
        .limit(1)
    )

    if (error) {
      console.log('❌ Erro ao buscar usage:', error.message)
    } else if (currentUsage && currentUsage.length > 0) {
      const usage = currentUsage[0]
      console.log('📊 Estado atual:')
      console.log(`   User ID: ${usage.user_id}`)
      console.log(`   Período: ${usage.period_start} - ${usage.period_end}`)
      console.log(`   Créditos usados: ${usage.requests_used}`)
      console.log(`   Última atualização: ${usage.updated_at}`)
    } else {
      console.log('⚠️  Nenhum registro de usage encontrado')
    }

  } catch (error: any) {
    console.log('❌ Erro no teste de créditos:', error.message)
  }
}

async function simulateWebhookRenewal() {
  console.log('\n🔄 Simulando renovação via webhook...')
  
  try {
    // Simular chamada da função de renovação
    const { supabaseAdmin } = await import('../src/config/supabase.config')
    
    const { data, error } = await supabaseAdmin.rpc('initialize_user_credits', {
      p_user_id: USER_ID,
      p_plan_type: 'enterprise' as 'free' | 'starter' | 'enterprise' | 'unlimited'
    })

    if (error) {
      console.log('❌ Erro na renovação simulada:', error.message)
    } else {
      console.log('✅ Renovação simulada executada')
      console.log('   Resultado:', data)
      
      // Verificar se funcionou
      await testUserCredits()
    }

  } catch (error: any) {
    console.log('❌ Erro na simulação:', error.message)
  }
}

async function testStripeConnection() {
  console.log('\n🔗 Testando conexão com Stripe...')
  
  try {
    // Testar conexão básica
    const account = await stripe.accounts.retrieve()
    console.log('✅ Conexão Stripe OK')
    console.log(`   Account: ${account.display_name || account.id}`)
    console.log(`   Modo: ${account.livemode ? 'PRODUÇÃO' : 'TESTE'}`)
    
    // Testar customer específico
    try {
      const customer = await stripe.customers.retrieve('cus_SfmwhGgsR4WJU4')
      console.log('✅ Customer teste encontrado:', customer.email || customer.id)
    } catch (customerError: any) {
      console.log('⚠️  Customer teste não encontrado (normal se não existir)')
    }

  } catch (error: any) {
    console.log('❌ Erro na conexão Stripe:', error.message)
  }
}

async function main() {
  console.log('🧪 TESTE COMPLETO DE WEBHOOKS')
  console.log('===============================\n')

  await testWebhookHealth()
  await testWebhookEndpoint() 
  await testStripeConnection()
  await testUserCredits()
  await simulateWebhookRenewal()

  console.log('\n📋 PRÓXIMOS PASSOS:')
  console.log('===================\n')
  console.log('1. Se health check falhou: Configure STRIPE_WEBHOOK_SECRET')
  console.log('2. Se Stripe falhou: Verifique STRIPE_SECRET_KEY')
  console.log('3. Para testar webhook real: Use Stripe CLI')
  console.log('   stripe listen --forward-to localhost:8000/api/v1/webhooks/stripe')
  console.log('   stripe trigger invoice.payment_succeeded\n')
  
  console.log('4. Para produção: Configure webhook no dashboard Stripe')
  console.log('   URL: https://SEU-DOMINIO.com/api/v1/webhooks/stripe\n')
  
  console.log('✅ Testes concluídos!')
}

if (require.main === module) {
  main()
}