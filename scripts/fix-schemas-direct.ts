import { Client } from 'pg'
import * as dotenv from 'dotenv'

// Carregar variáveis de ambiente
dotenv.config()

// ✅ CONSTRUIR CONNECTION STRING PARA POSTGRESQL
const supabaseUrl = process.env.SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE!

if (!supabaseUrl || !serviceKey) {
  console.error('❌ Credenciais do Supabase não encontradas no .env')
  process.exit(1)
}

// Extrair host do URL do Supabase
const urlParts = new URL(supabaseUrl)
const host = urlParts.hostname
const projectRef = host.split('.')[0]

// Connection string para PostgreSQL
const connectionString = `postgresql://postgres:[YOUR_PASSWORD]@db.${projectRef}.supabase.co:5432/postgres`

console.log('🎯 MAILTRENDZ - CORREÇÃO DE SCHEMAS VIA POSTGRESQL')
console.log('=' .repeat(50))
console.log('🔗 Host:', host)
console.log('📊 Project:', projectRef)

async function fixSchemasDirectly() {
  console.log('\n🚀 INICIANDO CORREÇÃO DIRETA...')

  // ✅ COMANDOS SQL SIMPLIFICADOS
  const commands = [
    {
      name: 'Adicionar coluna email em profiles',
      sql: `ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;`
    },
    {
      name: 'Adicionar coluna project_id em chats', 
      sql: `ALTER TABLE public.chats ADD COLUMN IF NOT EXISTS project_id UUID;`
    },
    {
      name: 'Criar índice para chats.project_id',
      sql: `CREATE INDEX IF NOT EXISTS idx_chats_project_id ON public.chats(project_id);`
    },
    {
      name: 'Criar índice para profiles.email',
      sql: `CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);`
    },
    {
      name: 'Adicionar foreign key constraint',
      sql: `
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'chats_project_id_fkey'
          ) THEN
            ALTER TABLE public.chats 
            ADD CONSTRAINT chats_project_id_fkey 
            FOREIGN KEY (project_id) 
            REFERENCES public.projects(id) 
            ON DELETE CASCADE;
          END IF;
        END $$;
      `
    }
  ]

  // ✅ TENTAR ABORDAGEM ALTERNATIVA - USANDO SUPABASE REST API
  console.log('🔄 Usando abordagem REST API...')
  
  for (const command of commands) {
    try {
      console.log(`\n⏳ ${command.name}...`)
      
      // Fazer request HTTP direto para o Supabase
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceKey}`,
          'apikey': serviceKey
        },
        body: JSON.stringify({ sql: command.sql })
      })

      if (response.ok) {
        console.log(`✅ ${command.name} - Sucesso`)
      } else {
        const error = await response.text()
        console.log(`⚠️ ${command.name} - Falhou: ${error}`)
      }
      
    } catch (error) {
      console.log(`❌ ${command.name} - Erro:`, error)
    }
  }

  // ✅ VERIFICAR RESULTADOS
  await verifyResults()
}

async function verifyResults() {
  console.log('\n🔍 VERIFICANDO RESULTADOS...')
  console.log('=' .repeat(30))

  try {
    // Testar se profiles.email existe
    const profilesTest = await fetch(`${supabaseUrl}/rest/v1/profiles?select=id,email&limit=1`, {
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'apikey': serviceKey
      }
    })

    if (profilesTest.ok) {
      console.log('✅ Tabela profiles com coluna email - OK')
    } else {
      console.log('❌ Tabela profiles com coluna email - FALHOU')
    }

    // Testar se chats.project_id existe
    const chatsTest = await fetch(`${supabaseUrl}/rest/v1/chats?select=id,project_id&limit=1`, {
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'apikey': serviceKey
      }
    })

    if (chatsTest.ok) {
      console.log('✅ Tabela chats com coluna project_id - OK')
    } else {
      console.log('❌ Tabela chats com coluna project_id - FALHOU')
    }

  } catch (error) {
    console.error('💥 Erro na verificação:', error)
  }
}

// ✅ CRIAR MIGRAÇÃO MANUAL SIMPLES
async function createManualMigration() {
  console.log('\n📝 CRIANDO MIGRAÇÃO MANUAL...')
  
  const migrationSQL = `
-- MIGRAÇÃO MANUAL - EXECUTE NO DASHBOARD DO SUPABASE
-- URL: https://kuhlihvgocoxscouzmeg.supabase.co/project/kuhlihvgocoxscouzmeg/sql

-- 1. Adicionar coluna email em profiles (se não existir)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. Adicionar coluna project_id em chats (se não existir)  
ALTER TABLE public.chats ADD COLUMN IF NOT EXISTS project_id UUID;

-- 3. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_chats_project_id ON public.chats(project_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- 4. Adicionar foreign key constraint
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'chats_project_id_fkey'
  ) THEN
    ALTER TABLE public.chats 
    ADD CONSTRAINT chats_project_id_fkey 
    FOREIGN KEY (project_id) 
    REFERENCES public.projects(id) 
    ON DELETE CASCADE;
  END IF;
END $$;

-- 5. Verificação final
SELECT 'profiles.email' as check_name, 
       CASE WHEN EXISTS (
         SELECT 1 FROM information_schema.columns 
         WHERE table_name = 'profiles' AND column_name = 'email'
       ) THEN 'EXISTS' ELSE 'MISSING' END as status

UNION ALL

SELECT 'chats.project_id' as check_name,
       CASE WHEN EXISTS (
         SELECT 1 FROM information_schema.columns 
         WHERE table_name = 'chats' AND column_name = 'project_id'
       ) THEN 'EXISTS' ELSE 'MISSING' END as status;
`

  console.log('📄 MIGRAÇÃO CRIADA EM: migration-manual.sql')
  
  // Salvar migração em arquivo
  const fs = require('fs')
  fs.writeFileSync('migration-manual.sql', migrationSQL)
  
  console.log('\n🎯 INSTRUÇÕES:')
  console.log('1. Abra: https://kuhlihvgocoxscouzmeg.supabase.co/project/kuhlihvgocoxscouzmeg/sql')
  console.log('2. Cole o SQL do arquivo migration-manual.sql')
  console.log('3. Execute o SQL')
  console.log('4. Reinicie o backend')
}

// ✅ EXECUTAR
fixSchemasDirectly()
  .then(() => createManualMigration())
  .then(() => {
    console.log('\n🎉 PROCESSO CONCLUÍDO!')
    console.log('🚀 Verifique os resultados e reinicie o backend')
  })
  .catch((error) => {
    console.error('\n💥 ERRO:', error)
    createManualMigration()
  })
