import dotenv from 'dotenv'
dotenv.config()

import { supabase } from '../src/config/supabase.config'

async function testProjectCreation() {
  console.log('🔍 Testando criação de projetos...\n')

  // Pegar um usuário existente
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email, subscription')
    .limit(1)

  if (!profiles || profiles.length === 0) {
    console.log('❌ Nenhum usuário encontrado')
    return
  }

  const userId = profiles[0].id
  console.log(`🧪 Testando com usuário: ${userId}`)
  console.log(`📧 Email: ${profiles[0].email}`)
  console.log(`📋 Plano: ${profiles[0].subscription}\n`)

  // Testar função check_project_limit
  try {
    const { data: canCreate, error } = await supabase
      .rpc('check_project_limit', { p_user_id: userId })
      
    if (error) {
      console.log(`❌ check_project_limit erro: ${error.message}`)
    } else {
      console.log(`✅ check_project_limit: ${canCreate}`)
    }
  } catch (error: any) {
    console.log(`❌ check_project_limit erro: ${error.message}`)
  }

  // Contar projetos existentes
  try {
    const { count, error } = await supabase
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      
    if (error) {
      console.log(`❌ Contagem de projetos erro: ${error.message}`)
    } else {
      console.log(`✅ Projetos existentes: ${count}`)
    }
  } catch (error: any) {
    console.log(`❌ Contagem de projetos erro: ${error.message}`)
  }

  // Verificar plan_features
  try {
    const { data: planFeatures, error } = await supabase
      .from('plan_features')
      .select('max_projects')
      .eq('plan_type', profiles[0].subscription)
      .single()
      
    if (error) {
      console.log(`❌ Plan features erro: ${error.message}`)
    } else {
      console.log(`✅ Limite de projetos do plano: ${planFeatures?.max_projects}`)
    }
  } catch (error: any) {
    console.log(`❌ Plan features erro: ${error.message}`)
  }

  // Testar user_has_feature (função que pode estar faltando)
  try {
    const { data: hasFeature, error } = await supabase
      .rpc('user_has_feature', { 
        p_user_id: userId, 
        p_feature: 'has_folders' 
      })
      
    if (error) {
      console.log(`❌ user_has_feature erro: ${error.message}`)
    } else {
      console.log(`✅ user_has_feature (folders): ${hasFeature}`)
    }
  } catch (error: any) {
    console.log(`❌ user_has_feature erro: ${error.message}`)
  }

  // Testar criação de projeto diretamente
  try {
    const testProject = {
      id: `test-${Date.now()}`,
      user_id: userId,
      name: 'Teste de Projeto',
      description: 'Projeto de teste',
      type: 'campaign',
      status: 'draft',
      content: {
        html: '<h1>Teste</h1>',
        text: 'Teste',
        subject: 'Assunto Teste',
        previewText: 'Preview'
      },
      metadata: {
        industry: 'teste',
        targetAudience: 'teste',
        tone: 'neutral',
        originalPrompt: 'teste',
        version: 1
      },
      tags: ['teste'],
      color: '#000000',
      is_public: false
    }

    const { data: createdProject, error } = await supabase
      .from('projects')
      .insert([testProject])
      .select()
      .single()
      
    if (error) {
      console.log(`❌ Criação direta erro: ${error.message}`)
    } else {
      console.log(`✅ Projeto criado diretamente: ${createdProject.id}`)
      
      // Deletar projeto de teste
      await supabase
        .from('projects')
        .delete()
        .eq('id', createdProject.id)
        
      console.log(`✅ Projeto de teste deletado`)
    }
  } catch (error: any) {
    console.log(`❌ Criação direta erro: ${error.message}`)
  }
}

testProjectCreation().catch(console.error)
