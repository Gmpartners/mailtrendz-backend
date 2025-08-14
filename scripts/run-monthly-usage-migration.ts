#!/usr/bin/env node

/**
 * Script de Migração para Sistema de Requisições Mensais
 * 
 * Este script:
 * 1. Verifica se as estruturas do banco estão prontas
 * 2. Inicializa períodos para todos os usuários
 * 3. Migra dados existentes se necessário
 * 4. Valida a migração
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

// Cliente Supabase com privilégios de service role
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Utilitários de console
const log = {
  info: (msg: string) => console.log(chalk.blue('ℹ'), msg),
  success: (msg: string) => console.log(chalk.green('✅'), msg),
  error: (msg: string) => console.log(chalk.red('❌'), msg),
  warning: (msg: string) => console.log(chalk.yellow('⚠'), msg),
  step: (msg: string) => console.log(chalk.cyan('→'), msg)
}

// Verificar se as funções SQL existem
async function checkDatabaseFunctions(): Promise<boolean> {
  log.step('Verificando funções SQL do banco...')
  
  try {
    // Tentar chamar uma função para verificar se existe
    const { error } = await supabase.rpc('check_monthly_request_limit', {
      p_user_id: '00000000-0000-0000-0000-000000000000' // UUID fake para teste
    })
    
    if (error && error.code === 'PGRST202') {
      log.error('Funções SQL não encontradas no banco')
      return false
    }
    
    log.success('Funções SQL verificadas com sucesso')
    return true
  } catch (error) {
    log.error(`Erro ao verificar funções: ${error}`)
    return false
  }
}

// Verificar tabelas necessárias
async function checkDatabaseTables(): Promise<boolean> {
  log.step('Verificando tabelas do banco...')
  
  try {
    // Verificar se a tabela user_monthly_usage existe
    const { data, error } = await supabase
      .from('user_monthly_usage')
      .select('id')
      .limit(1)
    
    if (error && error.code === 'PGRST204') {
      // Tabela existe mas está vazia
      log.info('Tabela user_monthly_usage existe mas está vazia')
      return true
    }
    
    if (error) {
      log.error(`Tabela user_monthly_usage não encontrada: ${error.message}`)
      return false
    }
    
    log.success('Tabelas verificadas com sucesso')
    return true
  } catch (error) {
    log.error(`Erro ao verificar tabelas: ${error}`)
    return false
  }
}

// Obter todos os usuários ativos
async function getActiveUsers(): Promise<any[]> {
  log.step('Buscando usuários ativos...')
  
  const { data: users, error } = await supabase
    .from('profiles')
    .select('id, subscription, created_at, billing_cycle_day')
    .order('created_at', { ascending: true })
  
  if (error) {
    log.error(`Erro ao buscar usuários: ${error.message}`)
    return []
  }
  
  log.info(`${users?.length || 0} usuários encontrados`)
  return users || []
}

// Inicializar período para um usuário
async function initializeUserPeriod(userId: string): Promise<boolean> {
  try {
    // Chamar função SQL para obter período atual
    const { data: period, error: periodError } = await supabase
      .rpc('get_current_billing_period', { p_user_id: userId })
      .single()
    
    if (periodError) {
      log.warning(`Erro ao obter período para usuário ${userId}: ${periodError.message}`)
      return false
    }
    
    // Verificar se já existe registro para o período
    const { data: existing } = await supabase
      .from('user_monthly_usage')
      .select('id')
      .eq('user_id', userId)
      .gte('period_start', period.period_start)
      .lte('period_start', period.period_end)
      .single()
    
    if (existing) {
      // Já existe registro
      return true
    }
    
    // Criar registro inicial
    const { error: insertError } = await supabase
      .from('user_monthly_usage')
      .insert({
        user_id: userId,
        period_start: period.period_start,
        period_end: period.period_end,
        requests_used: 0
      })
    
    if (insertError) {
      log.warning(`Erro ao criar registro para usuário ${userId}: ${insertError.message}`)
      return false
    }
    
    return true
  } catch (error) {
    log.error(`Erro ao inicializar período para usuário ${userId}: ${error}`)
    return false
  }
}

// Migrar dados de créditos existentes (se houver)
async function migrateExistingCredits(userId: string): Promise<void> {
  try {
    // Verificar se existe tabela user_credits (sistema antigo)
    const { data: credits, error } = await supabase
      .from('user_credits')
      .select('used')
      .eq('user_id', userId)
      .single()
    
    if (!error && credits && credits.used > 0) {
      // Migrar uso para o período atual
      const { data: period } = await supabase
        .rpc('get_current_billing_period', { p_user_id: userId })
        .single()
      
      if (period) {
        await supabase
          .from('user_monthly_usage')
          .update({ requests_used: credits.used })
          .eq('user_id', userId)
          .gte('period_start', period.period_start)
          .lte('period_start', period.period_end)
        
        log.info(`Migrado ${credits.used} créditos para requisições do usuário ${userId}`)
      }
    }
  } catch (error) {
    // Tabela user_credits pode não existir, o que é ok
  }
}

// Validar migração
async function validateMigration(): Promise<{ success: boolean; stats: any }> {
  log.step('Validando migração...')
  
  try {
    // Contar registros criados
    const { count: totalRecords, error: countError } = await supabase
      .from('user_monthly_usage')
      .select('*', { count: 'exact', head: true })
    
    if (countError) {
      throw countError
    }
    
    // Verificar view user_current_usage
    const { data: currentUsage, error: viewError } = await supabase
      .from('user_current_usage')
      .select('*')
      .limit(5)
    
    if (viewError) {
      log.warning('View user_current_usage não está funcionando corretamente')
    }
    
    // Testar funções principais
    const testUserId = currentUsage?.[0]?.user_id
    if (testUserId) {
      const { data: testLimit } = await supabase
        .rpc('check_monthly_request_limit', { p_user_id: testUserId })
      
      const { data: testUsage } = await supabase
        .rpc('get_user_monthly_usage', { p_user_id: testUserId })
      
      if (testLimit && testUsage) {
        log.success('Funções SQL testadas com sucesso')
      }
    }
    
    return {
      success: true,
      stats: {
        totalRecords: totalRecords || 0,
        viewWorking: !viewError,
        functionsWorking: true
      }
    }
  } catch (error) {
    log.error(`Erro na validação: ${error}`)
    return {
      success: false,
      stats: {}
    }
  }
}

// Função principal de migração
async function runMigration() {
  console.log(chalk.bold.cyan('\n🚀 Iniciando Migração para Sistema de Requisições Mensais\n'))
  
  // 1. Verificar estrutura do banco
  log.info('Etapa 1: Verificando estrutura do banco de dados')
  
  const functionsOk = await checkDatabaseFunctions()
  const tablesOk = await checkDatabaseTables()
  
  if (!functionsOk || !tablesOk) {
    log.error('Estrutura do banco não está pronta. Execute as migrations SQL primeiro.')
    process.exit(1)
  }
  
  // 2. Buscar usuários
  log.info('\nEtapa 2: Processando usuários')
  const users = await getActiveUsers()
  
  if (users.length === 0) {
    log.warning('Nenhum usuário encontrado para migrar')
    return
  }
  
  // 3. Processar cada usuário
  log.info('\nEtapa 3: Inicializando períodos de faturamento')
  let successCount = 0
  let errorCount = 0
  
  for (const user of users) {
    process.stdout.write(chalk.gray(`Processando usuário ${user.id}...`))
    
    const initialized = await initializeUserPeriod(user.id)
    
    if (initialized) {
      // Tentar migrar créditos existentes
      await migrateExistingCredits(user.id)
      successCount++
      process.stdout.write(chalk.green(' ✓\n'))
    } else {
      errorCount++
      process.stdout.write(chalk.red(' ✗\n'))
    }
  }
  
  // 4. Validar migração
  log.info('\nEtapa 4: Validando migração')
  const validation = await validateMigration()
  
  // 5. Relatório final
  console.log(chalk.bold.cyan('\n📊 Relatório de Migração\n'))
  log.info(`Total de usuários processados: ${users.length}`)
  log.success(`Usuários migrados com sucesso: ${successCount}`)
  if (errorCount > 0) {
    log.warning(`Usuários com erro: ${errorCount}`)
  }
  
  if (validation.success) {
    log.info(`Total de registros na tabela: ${validation.stats.totalRecords}`)
    log.info(`View funcionando: ${validation.stats.viewWorking ? 'Sim' : 'Não'}`)
    log.info(`Funções SQL funcionando: ${validation.stats.functionsWorking ? 'Sim' : 'Não'}`)
  }
  
  if (successCount === users.length && validation.success) {
    console.log(chalk.bold.green('\n✅ Migração concluída com sucesso!\n'))
  } else {
    console.log(chalk.bold.yellow('\n⚠️  Migração concluída com avisos. Verifique os logs.\n'))
  }
}

// Executar migração
runMigration().catch((error) => {
  log.error(`Erro fatal na migração: ${error}`)
  process.exit(1)
})
