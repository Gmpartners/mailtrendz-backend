const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

async function debugChatHTML() {
  const chatId = 'c9d75e63-1cec-4fc7-a44f-c2d76dcdccea' // Chat ID dos logs anteriores
  
  console.log('🔍 DEBUGANDO CHAT HTML - ID:', chatId)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  
  try {
    // 1. BUSCAR TODAS AS MENSAGENS DO CHAT
    const { data: messages, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('❌ Erro ao buscar mensagens:', error)
      return
    }
    
    console.log(`📨 Total de mensagens encontradas: ${messages.length}`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    // 2. ANALISAR CADA MENSAGEM
    messages.forEach((msg, index) => {
      console.log(`\n📋 MENSAGEM ${index + 1}:`)
      console.log(`   ID: ${msg.id}`)
      console.log(`   Role: ${msg.role}`)
      console.log(`   Tamanho da mensagem: ${msg.message?.length || 0}`)
      console.log(`   Created: ${msg.created_at}`)
      
      // VERIFICAR METADATA
      if (msg.metadata) {
        console.log(`   ✅ TEM METADATA - Tipo: ${typeof msg.metadata}`)
        
        if (typeof msg.metadata === 'object') {
          console.log(`   📦 Keys do metadata:`, Object.keys(msg.metadata))
          
          // VERIFICAR SE TEM ARTIFACTS
          if (msg.metadata.artifacts) {
            console.log(`   🎯 TEM ARTIFACTS!`)
            console.log(`   📄 Tipo dos artifacts:`, typeof msg.metadata.artifacts)
            
            // SE ARTIFACTS É OBJETO
            if (typeof msg.metadata.artifacts === 'object') {
              console.log(`   🔑 Keys dos artifacts:`, Object.keys(msg.metadata.artifacts))
              
              if (msg.metadata.artifacts.type) {
                console.log(`   📝 Artifact type: ${msg.metadata.artifacts.type}`)
              }
              
              if (msg.metadata.artifacts.content) {
                const contentLength = msg.metadata.artifacts.content?.length || 0
                console.log(`   📏 Content length: ${contentLength}`)
                
                // VERIFICAR SE É HTML
                if (contentLength > 0 && msg.metadata.artifacts.content.includes('<html')) {
                  console.log(`   🎉 ENCONTROU HTML! Primeiros 100 chars:`)
                  console.log(`   "${msg.metadata.artifacts.content.substring(0, 100)}..."`)
                }
              }
            }
            
            // SE ARTIFACTS É STRING
            if (typeof msg.metadata.artifacts === 'string') {
              console.log(`   📏 String length: ${msg.metadata.artifacts.length}`)
              if (msg.metadata.artifacts.includes('<html')) {
                console.log(`   🎉 ENCONTROU HTML NA STRING!`)
                console.log(`   Primeiros 100 chars: "${msg.metadata.artifacts.substring(0, 100)}..."`)
              }
            }
          } else {
            console.log(`   ❌ SEM ARTIFACTS no metadata`)
          }
        }
      } else {
        console.log(`   ❌ SEM METADATA`)
      }
      
      // VERIFICAR COLUNA ARTIFACTS (se existir)
      if (msg.artifacts !== undefined) {
        console.log(`   📦 TEM COLUNA ARTIFACTS - Tipo: ${typeof msg.artifacts}`)
        if (msg.artifacts && typeof msg.artifacts === 'string' && msg.artifacts.includes('<html')) {
          console.log(`   🎉 ENCONTROU HTML NA COLUNA ARTIFACTS!`)
        }
      }
      
      // VERIFICAR SE O MESSAGE CONTÉM HTML
      if (msg.message && msg.message.includes('<html')) {
        console.log(`   🎯 MESSAGE CONTÉM HTML!`)
        console.log(`   Primeiros 200 chars: "${msg.message.substring(0, 200)}..."`)
      }
    })
    
    // 3. TESTAR A FUNÇÃO RPC
    console.log('\n🔧 TESTANDO FUNÇÃO RPC get_latest_html_from_chat...')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    const { data: rpcResult, error: rpcError } = await supabase.rpc('get_latest_html_from_chat', {
      p_chat_id: chatId
    })
    
    if (rpcError) {
      console.error('❌ Erro na RPC:', rpcError)
    } else {
      console.log('✅ RPC executada com sucesso')
      console.log(`📏 Resultado length: ${rpcResult?.length || 0}`)
      if (rpcResult && rpcResult.length > 0) {
        console.log(`🎉 HTML encontrado via RPC! Primeiros 100 chars:`)
        console.log(`"${rpcResult.substring(0, 100)}..."`)
      } else {
        console.log('❌ RPC não retornou HTML')
      }
    }
    
  } catch (error) {
    console.error('💥 ERRO CRÍTICO:', error)
  }
}

// EXECUTAR DEBUG
debugChatHTML().then(() => {
  console.log('\n🏁 Debug concluído!')
  process.exit(0)
}).catch(error => {
  console.error('💥 ERRO FINAL:', error)
  process.exit(1)
})