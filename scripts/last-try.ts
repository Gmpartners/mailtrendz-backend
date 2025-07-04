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

console.log('🎯 ÚLTIMA TENTATIVA AUTOMÁTICA - FASE 1')
console.log('=' .repeat(40))

async function lastTry() {
  console.log('🔧 Tentando executar ALTER TABLE diretos...')

  // ✅ TENTAR CRIAR FUNÇÃO TEMPORÁRIA
  try {
    console.log('\n1️⃣ Criando função temporária de execução...')
    
    const createFunctionSQL = `
      CREATE OR REPLACE FUNCTION execute_schema_fix()
      RETURNS TEXT AS $$
      BEGIN
        -- Adicionar email em profiles
        ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
        
        -- Adicionar project_id em chats  
        ALTER TABLE public.chats ADD COLUMN IF NOT EXISTS project_id UUID;
        
        -- Criar índices
        CREATE INDEX IF NOT EXISTS idx_chats_project_id ON public.chats(project_id);
        CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
        
        RETURN 'Schema fixed successfully';
      END;
      $$ LANGUAGE plpgsql;
    `
    
    // Tentar diferentes métodos de execução
    const methods = [
      () => supabase.rpc('execute_schema_fix'),
      () => supabase.from('pg_stat_statements').select('query').limit(0), // trigger SQL execution
    ]
    
    for (const method of methods) {
      try {
        const result = await method()
        console.log('📊 Resultado:', result)
      } catch (error: any) {
        console.log('⚠️ Método falhou:', error.message)
      }
    }

  } catch (error: any) {
    console.log('❌ Erro:', error.message)
  }

  // ✅ VERIFICAÇÃO FINAL SIMPLES
  console.log('\n🔍 Verificação final...')
  
  try {
    // Testar profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1)
    
    if (profilesError) {
      console.log('❌ Profiles error:', profilesError.message)
    } else {
      console.log('✅ Profiles OK - Campos:', Object.keys(profiles[0] || {}))
    }

    // Testar chats
    const { data: chats, error: chatsError } = await supabase
      .from('chats')
      .select('*')
      .limit(1)
    
    if (chatsError) {
      console.log('❌ Chats error:', chatsError.message)
    } else {
      console.log('✅ Chats OK - Campos:', Object.keys(chats[0] || {}))
    }

  } catch (error: any) {
    console.log('💥 Verificação falhou:', error.message)
  }

  console.log('\n📋 RECOMENDAÇÃO FINAL:')
  console.log('🔗 Abra: https://kuhlihvgocoxscouzmeg.supabase.co/project/kuhlihvgocoxscouzmeg/sql')
  console.log('📝 Execute o SQL do arquivo migration-manual.sql')
  console.log('⏱️ Tempo estimado: 2 minutos')
}

lastTry()
  .then(() => {
    console.log('\n🎯 TENTATIVA CONCLUÍDA')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 ERRO:', error)
    process.exit(1)
  })
