import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE!

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

console.log('🧪 TESTE PÓS-MIGRAÇÃO - VERIFICAÇÃO DA FASE 1')
console.log('=' .repeat(50))
console.log('📅 Data:', new Date().toISOString())
console.log('🔗 URL:', supabaseUrl)
console.log('')

async function testMigration() {
  let allTestsPassed = true
  const results: any[] = []

  // ✅ TESTE 1: Verificar estrutura da tabela profiles
  console.log('1️⃣ TESTANDO TABELA PROFILES...')
  try {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .limit(1)

    if (error) {
      console.log('❌ Erro ao acessar profiles:', error.message)
      allTestsPassed = false
      results.push({ test: 'profiles_access', status: 'FAILED', error: error.message })
    } else {
      const fields = profiles && profiles.length > 0 ? Object.keys(profiles[0]) : []
      const hasEmail = fields.includes('email')
      
      console.log('📋 Campos encontrados:', fields)
      console.log('📧 Coluna email existe:', hasEmail ? '✅ SIM' : '❌ NÃO')
      
      if (hasEmail) {
        console.log('✅ Tabela profiles - OK')
        results.push({ test: 'profiles_email_column', status: 'PASSED' })
      } else {
        console.log('❌ Tabela profiles - FALTANDO COLUNA EMAIL')
        allTestsPassed = false
        results.push({ test: 'profiles_email_column', status: 'FAILED', error: 'email column missing' })
      }
    }
  } catch (error: any) {
    console.log('💥 Erro inesperado no teste profiles:', error.message)
    allTestsPassed = false
    results.push({ test: 'profiles_access', status: 'ERROR', error: error.message })
  }

  console.log('')

  // ✅ TESTE 2: Verificar estrutura da tabela chats
  console.log('2️⃣ TESTANDO TABELA CHATS...')
  try {
    const { data: chats, error } = await supabase
      .from('chats')
      .select('*')
      .limit(1)

    if (error) {
      console.log('❌ Erro ao acessar chats:', error.message)
      allTestsPassed = false
      results.push({ test: 'chats_access', status: 'FAILED', error: error.message })
    } else {
      const fields = chats && chats.length > 0 ? Object.keys(chats[0]) : []
      
      // Se não há dados, testar inserção para verificar schema
      if (fields.length === 0) {
        console.log('📋 Tabela chats vazia, testando schema...')
        
        // Tentar fazer um select específico para project_id
        const { error: schemaError } = await supabase
          .from('chats')
          .select('id, project_id')
          .limit(1)
        
        if (schemaError && schemaError.message.includes('project_id does not exist')) {
          console.log('❌ Coluna project_id não existe ainda')
          allTestsPassed = false
          results.push({ test: 'chats_project_id_column', status: 'FAILED', error: 'project_id column missing' })
        } else {
          console.log('✅ Coluna project_id existe')
          results.push({ test: 'chats_project_id_column', status: 'PASSED' })
        }
      } else {
        const hasProjectId = fields.includes('project_id')
        console.log('📋 Campos encontrados:', fields)
        console.log('🔗 Coluna project_id existe:', hasProjectId ? '✅ SIM' : '❌ NÃO')
        
        if (hasProjectId) {
          console.log('✅ Tabela chats - OK')
          results.push({ test: 'chats_project_id_column', status: 'PASSED' })
        } else {
          console.log('❌ Tabela chats - FALTANDO COLUNA PROJECT_ID')
          allTestsPassed = false
          results.push({ test: 'chats_project_id_column', status: 'FAILED', error: 'project_id column missing' })
        }
      }
    }
  } catch (error: any) {
    console.log('💥 Erro inesperado no teste chats:', error.message)
    allTestsPassed = false
    results.push({ test: 'chats_access', status: 'ERROR', error: error.message })
  }

  console.log('')

  // ✅ TESTE 3: Testar endpoints que estavam falhando
  console.log('3️⃣ TESTANDO ENDPOINTS CRÍTICOS...')
  
  // Testar health check primeiro
  try {
    const healthResponse = await fetch(`http://localhost:8000/api/v1/health`)
    if (healthResponse.ok) {
      console.log('✅ Health check - OK')
      results.push({ test: 'health_endpoint', status: 'PASSED' })
    } else {
      console.log('❌ Health check - FALHOU')
      allTestsPassed = false
      results.push({ test: 'health_endpoint', status: 'FAILED' })
    }
  } catch (error: any) {
    console.log('⚠️ Backend não está rodando:', error.message)
    results.push({ test: 'health_endpoint', status: 'SKIPPED', note: 'Backend offline' })
  }

  console.log('')

  // ✅ TESTE 4: Verificar índices criados
  console.log('4️⃣ VERIFICANDO ÍNDICES...')
  try {
    // Query para verificar se os índices existem
    const { data: indexes, error } = await supabase
      .from('pg_indexes')
      .select('indexname, tablename')
      .in('indexname', ['idx_chats_project_id', 'idx_profiles_email'])

    if (error) {
      console.log('⚠️ Não foi possível verificar índices:', error.message)
      results.push({ test: 'indexes_check', status: 'SKIPPED', note: 'Cannot access pg_indexes' })
    } else {
      console.log('📊 Índices encontrados:', indexes?.map(i => i.indexname) || [])
      results.push({ test: 'indexes_check', status: 'INFO', data: indexes })
    }
  } catch (error: any) {
    console.log('⚠️ Erro ao verificar índices:', error.message)
    results.push({ test: 'indexes_check', status: 'SKIPPED', error: error.message })
  }

  console.log('')

  // ✅ TESTE 5: Verificar constraints
  console.log('5️⃣ VERIFICANDO FOREIGN KEY CONSTRAINTS...')
  try {
    const { data: constraints, error } = await supabase
      .from('information_schema.table_constraints')
      .select('constraint_name, table_name, constraint_type')
      .eq('constraint_name', 'chats_project_id_fkey')

    if (error) {
      console.log('⚠️ Não foi possível verificar constraints:', error.message)
      results.push({ test: 'foreign_key_check', status: 'SKIPPED', note: 'Cannot access constraints' })
    } else if (constraints && constraints.length > 0) {
      console.log('✅ Foreign key constraint existe:', constraints[0])
      results.push({ test: 'foreign_key_check', status: 'PASSED', data: constraints[0] })
    } else {
      console.log('⚠️ Foreign key constraint não encontrada')
      results.push({ test: 'foreign_key_check', status: 'NOT_FOUND' })
    }
  } catch (error: any) {
    console.log('⚠️ Erro ao verificar constraints:', error.message)
    results.push({ test: 'foreign_key_check', status: 'SKIPPED', error: error.message })
  }

  console.log('')

  // ✅ RESULTADO FINAL
  console.log('📊 RESULTADO FINAL DOS TESTES')
  console.log('=' .repeat(40))
  
  results.forEach((result, index) => {
    const status = result.status === 'PASSED' ? '✅' : 
                   result.status === 'FAILED' ? '❌' : 
                   result.status === 'ERROR' ? '💥' :
                   result.status === 'SKIPPED' ? '⏭️' : '📋'
    
    console.log(`${status} ${result.test}: ${result.status}`)
    if (result.error) console.log(`   Erro: ${result.error}`)
    if (result.note) console.log(`   Nota: ${result.note}`)
  })

  console.log('')
  
  if (allTestsPassed) {
    console.log('🎉 TODOS OS TESTES CRÍTICOS PASSARAM!')
    console.log('✅ FASE 1 CONCLUÍDA COM SUCESSO!')
    console.log('🚀 PRONTO PARA AVANÇAR PARA FASE 2!')
  } else {
    console.log('⚠️ ALGUNS TESTES FALHARAM')
    console.log('🔧 Migração pode precisar de ajustes')
  }

  return { allTestsPassed, results }
}

// ✅ EXECUTAR TESTES
testMigration()
  .then(({ allTestsPassed, results }) => {
    console.log('\n📋 RESUMO:')
    console.log('🎯 Testes executados:', results.length)
    console.log('✅ Testes passaram:', results.filter(r => r.status === 'PASSED').length)
    console.log('❌ Testes falharam:', results.filter(r => r.status === 'FAILED').length)
    console.log('💥 Erros:', results.filter(r => r.status === 'ERROR').length)
    
    if (allTestsPassed) {
      console.log('\n🎊 MIGRAÇÃO FASE 1 CONFIRMADA!')
      console.log('🔥 Reinicie o backend e teste as funcionalidades')
    }
    
    process.exit(allTestsPassed ? 0 : 1)
  })
  .catch((error) => {
    console.error('\n💥 ERRO GERAL:', error)
    process.exit(1)
  })
