#!/usr/bin/env node

/**
 * Script para configurar e testar webhooks do Stripe
 * 
 * Uso:
 * npm run setup-webhooks
 * ou
 * npx tsx scripts/setup-webhooks.ts
 */

import dotenv from 'dotenv'
import Stripe from 'stripe'

dotenv.config()

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-06-30.basil'
})

const WEBHOOK_EVENTS = [
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated', 
  'customer.subscription.deleted',
  'invoice.payment_succeeded',
  'invoice.payment_failed',
  'invoice.upcoming',
  'customer.subscription.trial_will_end'
]

async function main() {
  console.log('🔧 CONFIGURAÇÃO DE WEBHOOKS STRIPE')
  console.log('=====================================\n')

  // Verificar configuração
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('❌ STRIPE_SECRET_KEY não encontrada no .env')
    process.exit(1)
  }

  const isTest = process.env.STRIPE_SECRET_KEY.startsWith('sk_test_')
  console.log(`🔑 Modo: ${isTest ? 'TESTE' : 'PRODUÇÃO'}`)
  console.log(`🔗 Chave: ${process.env.STRIPE_SECRET_KEY.substring(0, 20)}...`)

  try {
    // Listar webhooks existentes
    console.log('\n📋 WEBHOOKS EXISTENTES:')
    const existingWebhooks = await stripe.webhookEndpoints.list()
    
    if (existingWebhooks.data.length === 0) {
      console.log('   Nenhum webhook encontrado')
    } else {
      existingWebhooks.data.forEach((webhook, index) => {
        console.log(`   ${index + 1}. ${webhook.url}`)
        console.log(`      Status: ${webhook.status}`)
        console.log(`      Eventos: ${webhook.enabled_events.length}`)
        console.log(`      ID: ${webhook.id}`)
        console.log('')
      })
    }

    // Instruções para configuração manual
    console.log('📝 INSTRUÇÕES DE CONFIGURAÇÃO:')
    console.log('===============================\n')

    const dashboardUrl = isTest 
      ? 'https://dashboard.stripe.com/test/webhooks'
      : 'https://dashboard.stripe.com/webhooks'

    console.log(`1. Acesse: ${dashboardUrl}`)
    console.log('2. Clique em "Add endpoint"')
    console.log('3. Configure os seguintes dados:\n')
    
    console.log('   📍 ENDPOINT URL:')
    console.log(`      Desenvolvimento: http://localhost:8000/api/v1/webhooks/stripe`)
    console.log(`      Produção: https://SEU-DOMINIO.com/api/v1/webhooks/stripe\n`)
    
    console.log('   🎯 EVENTOS PARA SELECIONAR:')
    WEBHOOK_EVENTS.forEach(event => {
      console.log(`      ✓ ${event}`)
    })

    console.log('\n   🔐 APÓS CRIAR O WEBHOOK:')
    console.log('      1. Copie o "Signing secret" (começará com whsec_)')
    console.log('      2. Atualize STRIPE_WEBHOOK_SECRET no .env')
    console.log('      3. Execute: npm run test-webhooks\n')

    // Verificar webhook secret
    if (process.env.STRIPE_WEBHOOK_SECRET) {
      console.log('✅ STRIPE_WEBHOOK_SECRET configurado')
      console.log(`   Secret: ${process.env.STRIPE_WEBHOOK_SECRET.substring(0, 15)}...`)
    } else {
      console.log('❌ STRIPE_WEBHOOK_SECRET não configurado')
      console.log('   Configure após criar o webhook no dashboard')
    }

    // Instruções para desenvolvimento local
    console.log('\n🔧 PARA DESENVOLVIMENTO LOCAL:')
    console.log('==============================\n')
    console.log('1. Instale a Stripe CLI:')
    console.log('   npm install -g @stripe/stripe-cli')
    console.log('   ou baixe em: https://stripe.com/docs/stripe-cli\n')
    
    console.log('2. Faça login:')
    console.log('   stripe login\n')
    
    console.log('3. Forward webhooks para sua API:')
    console.log('   stripe listen --forward-to localhost:8000/api/v1/webhooks/stripe\n')
    
    console.log('4. Em outro terminal, teste:')
    console.log('   stripe trigger invoice.payment_succeeded')
    console.log('   stripe trigger invoice.payment_failed\n')

    // Informações adicionais
    console.log('📊 MONITORAMENTO:')
    console.log('==================\n')
    console.log('• Health check: GET /api/v1/webhooks/health')
    console.log('• Logs de webhook: tail -f logs/combined.log | grep webhook')
    console.log('• Dashboard Stripe: Webhooks > Tentativas\n')

    console.log('✅ Configuração completa!')
    console.log('Execute: npm run test-webhooks após configurar o webhook')

  } catch (error: any) {
    console.error('❌ Erro:', error.message)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}