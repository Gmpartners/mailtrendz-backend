import dotenv from 'dotenv'
dotenv.config()

import { supabase } from '../src/config/supabase.config'

async function checkDatabaseTables() {
  console.log('🔍 Verificando tabelas do banco de dados...\n')

  // Verificar se as tabelas principais existem
  const tablesToCheck = [
    'profiles',
    'projects', 
    'subscriptions',
    'plan_features',
    'ai_credits',
    'user_subscription_info'
  ]

  for (const table of tablesToCheck) {
    try {
      const { error } = await supabase
        .from(table)
        .select('*')
        .limit(1)

      if (error) {
        console.log(`❌ ${table}: ${error.message}`)
      } else {
        console.log(`✅ ${table}: OK`)
      }
    } catch (error: any) {
      console.log(`❌ ${table}: ${error.message}`)
    }
  }

  console.log('\n🔍 Verificando funções SQL...\n')

  // Verificar se as funções SQL existem
  const functionsToCheck = [
    'check_project_limit',
    'check_user_credits',
    'consume_user_credits',
    'check_feature_access'
  ]

  for (const func of functionsToCheck) {
    try {
      const { error } = await supabase
        .rpc(func as any, { p_user_id: '123e4567-e89b-12d3-a456-426614174000' })

      if (error) {
        console.log(`❌ ${func}: ${error.message}`)
      } else {
        console.log(`✅ ${func}: OK`)
      }
    } catch (error: any) {
      console.log(`❌ ${func}: ${error.message}`)
    }
  }

  console.log('\n🔍 Verificando um usuário específico...\n')

  // Verificar se existe algum usuário com subscription info
  try {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, email, subscription')
      .limit(5)

    if (error) {
      console.log(`❌ Profiles: ${error.message}`)
    } else {
      console.log(`✅ Profiles encontrados: ${profiles.length}`)
      
      if (profiles.length > 0) {
        const userId = profiles[0].id
        console.log(`\n🔍 Testando funções para usuário: ${userId}`)
        
        // Testar função check_project_limit
        try {
          const { data: canCreate, error } = await supabase
            .rpc('check_project_limit', { p_user_id: userId })
            
          if (error) {
            console.log(`❌ check_project_limit: ${error.message}`)
          } else {
            console.log(`✅ check_project_limit: ${canCreate}`)
          }
        } catch (error: any) {
          console.log(`❌ check_project_limit: ${error.message}`)
        }

        // Verificar quantos projetos o usuário tem
        try {
          const { data: projects, error } = await supabase
            .from('projects')
            .select('id')
            .eq('user_id', userId)
            
          if (error) {
            console.log(`❌ Projetos do usuário: ${error.message}`)
          } else {
            console.log(`✅ Projetos do usuário: ${projects.length}`)
          }
        } catch (error: any) {
          console.log(`❌ Projetos do usuário: ${error.message}`)
        }

        // Verificar subscription info
        try {
          const { data: subInfo, error } = await supabase
            .from('user_subscription_info')
            .select('*')
            .eq('user_id', userId)
            .single()
            
          if (error) {
            console.log(`❌ Subscription info: ${error.message}`)
          } else {
            console.log(`✅ Subscription info:`, {
              plan_type: subInfo.plan_type,
              max_projects: subInfo.max_projects,
              credits_used: subInfo.credits_used,
              plan_credits: subInfo.plan_credits
            })
          }
        } catch (error: any) {
          console.log(`❌ Subscription info: ${error.message}`)
        }
      }
    }
  } catch (error: any) {
    console.log(`❌ Erro geral: ${error.message}`)
  }
}

checkDatabaseTables().catch(console.error)
