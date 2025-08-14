#!/usr/bin/env node

/**
 * Script para resetar o uso mensal de um usuário (útil para testes)
 * 
 * Uso: npm run reset-user-usage USER_ID
 */

import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import chalk from 'chalk'

// Carregar variáveis de ambiente
dotenv.config({ path: '.env' })

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(chalk.red('❌ Erro: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios'))
  process.exit(1)
}

// Cliente Supabase
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function resetUserUsage(userId?: string) {
  try {
    if (!userId) {
      console.error(chalk.red('❌ Erro: USER_ID é obrigatório'))
      console.log(chalk.yellow('Uso: npm run reset-user-usage USER_ID'))
      process.exit(1)
    }

    console.log(chalk.blue(`🔄 Resetando uso mensal do usuário: ${userId}`))

    // Obter período atual
    const { data: periodData, error: periodError } = await supabase
      .rpc('get_current_billing_period', { p_user_id: userId })
      .single()

    if (periodError) {
      console.error(chalk.red('❌ Erro ao obter período atual:'), periodError)
      process.exit(1)
    }

    // Resetar uso
    const { error } = await supabase
      .from('user_monthly_usage')
      .update({ 
        requests_used: 0,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .gte('period_start', periodData.period_start)
      .lte('period_start', periodData.period_end)

    if (error) {
      console.error(chalk.red('❌ Erro ao resetar uso:'), error)
      process.exit(1)
    }

    console.log(chalk.green('✅ Uso mensal resetado com sucesso!'))
    
    // Verificar novo status
    const { data: usage } = await supabase
      .rpc('get_user_monthly_usage', { p_user_id: userId })
      .single()

    if (usage) {
      console.log(chalk.cyan('\n📊 Status atual:'))
      console.log(chalk.gray(`   Requisições usadas: ${usage.requests_used}`))
      console.log(chalk.gray(`   Requisições disponíveis: ${usage.requests_available}`))
      console.log(chalk.gray(`   Limite mensal: ${usage.monthly_limit}`))
    }

  } catch (error) {
    console.error(chalk.red('❌ Erro:'), error)
    process.exit(1)
  }
}

// Executar
const userId = process.argv[2]
resetUserUsage(userId)
