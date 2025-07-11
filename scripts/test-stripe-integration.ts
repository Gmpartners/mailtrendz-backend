import dotenv from 'dotenv'

// ✅ IMPORTANTE: Carregar dotenv ANTES de importar qualquer módulo
dotenv.config()

import StripeService from '../src/services/stripe.service'
import { supabase } from '../src/config/supabase.config'

const testStripeIntegration = async () => {
  console.log('🧪 Testing Stripe Integration...\n')

  try {
    // Test 1: Environment variables
    console.log('1️⃣ Checking environment variables...')
    const requiredEnvVars = [
      'STRIPE_SECRET_KEY',
      'STRIPE_PUBLISHABLE_KEY',
      'STRIPE_WEBHOOK_SECRET',
      'SUPABASE_URL',
      'SUPABASE_ANON_KEY'
    ]

    const missingVars: string[] = []
    requiredEnvVars.forEach(varName => {
      if (!process.env[varName]) {
        missingVars.push(varName)
      } else {
        console.log(`   ✅ ${varName}: ${varName.includes('SECRET') ? '***hidden***' : process.env[varName]?.substring(0, 20) + '...'}`)
      }
    })

    if (missingVars.length > 0) {
      console.log('')
      console.log('❌ Missing environment variables:')
      missingVars.forEach(varName => {
        console.log(`   - ${varName}`)
      })
      return false
    }

    console.log('')

    // Test 2: Test Supabase connection
    console.log('2️⃣ Testing Supabase connection...')
    const { data: plans, error } = await supabase
      .from('plan_features')
      .select('*')
    
    if (error) {
      console.log('❌ Supabase error:', error.message)
      console.log('💡 Pode ser que as tabelas não existam ainda. Execute a migration.')
      return false
    } else {
      console.log('✅ Plan features found:', plans?.length || 0)
      plans?.forEach(plan => {
        console.log(`   - ${plan.plan_type}: ${plan.ai_credits} credits`)
      })
    }
    console.log('')

    // Test 3: Test Stripe API connection
    console.log('3️⃣ Testing Stripe API connection...')
    try {
      const priceIds = await StripeService.getPriceIds()
      console.log('✅ Stripe service initialized successfully')
      console.log('✅ Price IDs loaded:', Object.keys(priceIds).length)
      console.log('')
    } catch (stripeError: any) {
      console.log('❌ Stripe initialization error:', stripeError.message)
      return false
    }

    // Test 4: Test Plans Info
    console.log('4️⃣ Testing Plans Info...')
    try {
      const plansInfo = await StripeService.getPlansInfo()
      console.log('✅ Plans info loaded:', Object.keys(plansInfo).length)
      console.log('')
    } catch (error: any) {
      console.log('❌ Plans info error:', error.message)
      return false
    }

    console.log('🎉 TODOS OS TESTES PASSARAM!')
    console.log('✅ Integração Stripe está funcionando corretamente')
    console.log('✅ Pronto para usar no frontend')
    
    return true

  } catch (error: any) {
    console.log('❌ Test failed:', error.message)
    return false
  }
}

// Run the test
testStripeIntegration().then((success) => {
  console.log('\n✨ Test completed!')
  if (success) {
    console.log('🚀 Próximo passo: Testar com npm run dev')
  } else {
    console.log('🔧 Corrija os problemas antes de prosseguir')
  }
  process.exit(success ? 0 : 1)
}).catch((error) => {
  console.error('💥 Test crashed:', error)
  process.exit(1)
})
