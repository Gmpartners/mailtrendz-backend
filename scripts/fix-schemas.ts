import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

// Carregar variáveis de ambiente
dotenv.config()

// ✅ CONFIGURAÇÃO DO SUPABASE ADMIN
const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Credenciais do Supabase não encontradas no .env')
  process.exit(1)
}

// Cliente admin com permissões totais
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function fixSchemas() {
  console.log('🚀 INICIANDO CORREÇÃO DE SCHEMAS - FASE 1')
  console.log('=' .repeat(50))

  try {
    // Ler o arquivo SQL
    const sqlPath = path.join(__dirname, '..', 'scripts', 'fix-schemas.sql')
    const sqlContent = fs.readFileSync(sqlPath, 'utf-8')

    console.log('📖 SQL carregado:', sqlPath)
    console.log('📏 Tamanho:', sqlContent.length, 'caracteres')

    // Executar o SQL
    console.log('\n🔧 Executando correções de schema...')
    
    const { data, error } = await supabaseAdmin.rpc('exec', {
      sql: sqlContent
    })

    if (error) {
      console.error('❌ Erro ao executar SQL:', error)
      
      // Tentar método alternativo - executar por partes
      console.log('\n🔄 Tentando método alternativo...')
      await executeByParts()
      
    } else {
      console.log('✅ SQL executado com sucesso!')
      console.log('📊 Resultado:', data)
    }

    // Verificar se as correções funcionaram
    await verifyFixes()

  } catch (error) {
    console.error('💥 Erro inesperado:', error)
    process.exit(1)
  }
}

async function executeByParts() {
  console.log('🔧 Executando correções individuais...')

  try {
    // 1. Adicionar coluna email em profiles
    console.log('\n1️⃣ Adicionando coluna email em profiles...')
    const { error: emailError } = await supabaseAdmin.rpc('exec', {
      sql: `
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'profiles' 
                AND column_name = 'email'
                AND table_schema = 'public'
            ) THEN
                ALTER TABLE public.profiles ADD COLUMN email TEXT;
                RAISE NOTICE 'Coluna email adicionada à tabela profiles';
            END IF;
        END $$;
      `
    })

    if (emailError) {
      console.error('❌ Erro ao adicionar coluna email:', emailError)
    } else {
      console.log('✅ Coluna email processada')
    }

    // 2. Adicionar coluna project_id em chats
    console.log('\n2️⃣ Adicionando coluna project_id em chats...')
    const { error: projectIdError } = await supabaseAdmin.rpc('exec', {
      sql: `
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'chats' 
                AND column_name = 'project_id'
                AND table_schema = 'public'
            ) THEN
                ALTER TABLE public.chats ADD COLUMN project_id UUID;
                RAISE NOTICE 'Coluna project_id adicionada à tabela chats';
            END IF;
        END $$;
      `
    })

    if (projectIdError) {
      console.error('❌ Erro ao adicionar coluna project_id:', projectIdError)
    } else {
      console.log('✅ Coluna project_id processada')
    }

    // 3. Adicionar índices
    console.log('\n3️⃣ Criando índices...')
    const { error: indexError } = await supabaseAdmin.rpc('exec', {
      sql: `
        CREATE INDEX IF NOT EXISTS idx_chats_project_id ON public.chats(project_id);
        CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
      `
    })

    if (indexError) {
      console.error('❌ Erro ao criar índices:', indexError)
    } else {
      console.log('✅ Índices criados')
    }

  } catch (error) {
    console.error('💥 Erro na execução por partes:', error)
  }
}

async function verifyFixes() {
  console.log('\n🔍 VERIFICANDO CORREÇÕES...')
  console.log('=' .repeat(30))

  try {
    // Verificar coluna email em profiles
    const { data: profilesCheck, error: profilesError } = await supabaseAdmin
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'profiles')
      .eq('column_name', 'email')
      .eq('table_schema', 'public')

    if (profilesError) {
      console.error('❌ Erro ao verificar profiles:', profilesError)
    } else if (profilesCheck && profilesCheck.length > 0) {
      console.log('✅ Coluna email existe em profiles:', profilesCheck[0])
    } else {
      console.log('⚠️ Coluna email não encontrada em profiles')
    }

    // Verificar coluna project_id em chats
    const { data: chatsCheck, error: chatsError } = await supabaseAdmin
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'chats')
      .eq('column_name', 'project_id')
      .eq('table_schema', 'public')

    if (chatsError) {
      console.error('❌ Erro ao verificar chats:', chatsError)
    } else if (chatsCheck && chatsCheck.length > 0) {
      console.log('✅ Coluna project_id existe em chats:', chatsCheck[0])
    } else {
      console.log('⚠️ Coluna project_id não encontrada em chats')
    }

    // Teste de conexão com as tabelas
    console.log('\n🧪 TESTANDO CONEXÕES...')
    
    const { error: profilesTestError } = await supabaseAdmin
      .from('profiles')
      .select('id, email')
      .limit(1)

    if (profilesTestError) {
      console.error('❌ Erro ao testar profiles:', profilesTestError)
    } else {
      console.log('✅ Tabela profiles acessível')
    }

    const { error: chatsTestError } = await supabaseAdmin
      .from('chats')
      .select('id, project_id')
      .limit(1)

    if (chatsTestError) {
      console.error('❌ Erro ao testar chats:', chatsTestError)
    } else {
      console.log('✅ Tabela chats acessível')
    }

  } catch (error) {
    console.error('💥 Erro na verificação:', error)
  }
}

// ✅ EXECUTAR SCRIPT
console.log('🎯 MAILTRENDZ - CORREÇÃO DE SCHEMAS')
console.log('📅 Data:', new Date().toISOString())
console.log('🔗 URL:', supabaseUrl)

fixSchemas()
  .then(() => {
    console.log('\n🎉 CORREÇÃO CONCLUÍDA!')
    console.log('🚀 Reinicie o backend para aplicar as mudanças')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 FALHA NA CORREÇÃO:', error)
    process.exit(1)
  })
