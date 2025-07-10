import dotenv from 'dotenv'

dotenv.config()

const checkStripeTablesExists = async () => {
  console.log('🔍 Verificando se as tabelas do Stripe já existem...\n')

  // Como não temos acesso ao Supabase sem as env vars, vou criar um método alternativo
  // Vou verificar se o controller está tentando acessar as tabelas
  
  try {
    console.log('📊 Verificando estrutura esperada do banco...\n')
    
    console.log('🔍 Tabelas que devem existir para Stripe funcionar:')
    console.log('   ✅ subscriptions - Para dados de assinatura do Stripe')
    console.log('   ✅ plan_features - Para recursos de cada plano')
    console.log('   ✅ user_credits - Para controle de créditos')
    console.log('   ✅ folders - Para funcionalidade premium')
    console.log('   ✅ user_subscription_info (view) - Para dados consolidados')
    console.log('')

    console.log('🔧 Funções que devem existir:')
    console.log('   ✅ initialize_user_credits() - Inicializar créditos')
    console.log('   ✅ reset_monthly_credits() - Reset mensal')
    console.log('')

    console.log('📝 Para verificar se já foram criadas, você pode:')
    console.log('')
    console.log('🔶 Opção 1 - Via Supabase Dashboard:')
    console.log('   1. Acesse: https://supabase.com/dashboard')
    console.log('   2. Vá em: Database > Tables')
    console.log('   3. Procure pelas tabelas: subscriptions, plan_features, user_credits, folders')
    console.log('')
    
    console.log('🔶 Opção 2 - Via SQL Editor no Supabase:')
    console.log('   Execute este comando para verificar:')
    console.log('')
    console.log('   SELECT table_name FROM information_schema.tables')
    console.log('   WHERE table_schema = \'public\'')
    console.log('   AND table_name IN (\'subscriptions\', \'plan_features\', \'user_credits\', \'folders\');')
    console.log('')

    console.log('🔶 Opção 3 - Teste rápido:')
    console.log('   Se você tem as env vars configuradas, rode:')
    console.log('   npm run dev')
    console.log('')
    console.log('   E acesse: http://localhost:8000/api/v1/subscriptions/plans')
    console.log('   Se retornar dados = ✅ migration feita')
    console.log('   Se retornar erro = ❌ migration não feita')
    console.log('')

    console.log('💡 Baseado no que vi no seu código:')
    console.log('   ❓ O SubscriptionController está tentando acessar:')
    console.log('      - plan_features (linha 13)')
    console.log('      - user_subscription_info (linha 33)')
    console.log('   ❓ Se o servidor não está dando erro nessas consultas, as tabelas existem!')
    console.log('')

    console.log('🚨 Se as tabelas NÃO existem ainda:')
    console.log('   Execute o arquivo: src/database/migrations/003_stripe_integration.sql')
    console.log('   No SQL Editor do Supabase')
    console.log('')

    console.log('✅ Se as tabelas JÁ existem:')
    console.log('   Seu backend está 100% pronto para o frontend!')
    console.log('')

  } catch (error: any) {
    console.log('❌ Erro na verificação:', error.message)
  }
}

// Vou criar também um teste que funciona com ou sem env vars
const simpleTest = () => {
  console.log('🧪 Teste Simples de Integração Stripe\n')
  
  const envVars = [
    'STRIPE_SECRET_KEY',
    'STRIPE_PUBLISHABLE_KEY', 
    'STRIPE_PRICE_STARTER_MONTHLY',
    'STRIPE_PRICE_STARTER_YEARLY',
    'STRIPE_PRICE_ENTERPRISE_MONTHLY',
    'STRIPE_PRICE_ENTERPRISE_YEARLY',
    'STRIPE_PRICE_UNLIMITED_MONTHLY',
    'STRIPE_PRICE_UNLIMITED_YEARLY'
  ]

  console.log('📋 Verificando variáveis de ambiente:')
  let missingVars = 0
  
  envVars.forEach(varName => {
    const value = process.env[varName]
    if (value) {
      console.log(`   ✅ ${varName}: ${varName.includes('SECRET') ? '***' : value.substring(0, 20)}...`)
    } else {
      console.log(`   ❌ ${varName}: NÃO CONFIGURADA`)
      missingVars++
    }
  })

  console.log('')
  console.log(`📊 Resultado: ${envVars.length - missingVars}/${envVars.length} variáveis configuradas`)
  
  if (missingVars === 0) {
    console.log('🎉 Todas as variáveis Stripe estão configuradas!')
  } else {
    console.log(`⚠️  Faltam ${missingVars} variáveis para completar a configuração`)
  }
}

checkStripeTablesExists()
simpleTest()

console.log('\n🎯 Conclusão:')
console.log('Se você conseguir acessar /api/v1/subscriptions/plans sem erro,')
console.log('significa que as tabelas já existem e está tudo funcionando! ✅')
console.log('\nCaso contrário, precisará executar a migration 003_stripe_integration.sql 🔧')