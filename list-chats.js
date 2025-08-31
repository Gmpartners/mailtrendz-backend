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

async function listChats() {
  console.log('🔍 LISTANDO TODOS OS CHATS COM MENSAGENS...')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  
  try {
    // Buscar chats com contagem de mensagens
    const { data: chats, error } = await supabase
      .from('chat_messages')
      .select('chat_id, role, created_at, metadata')
      .order('created_at', { ascending: false })
      .limit(50)
    
    if (error) {
      console.error('❌ Erro ao buscar chats:', error)
      return
    }
    
    // Agrupar por chat_id
    const chatGroups = {}
    chats.forEach(msg => {
      if (!chatGroups[msg.chat_id]) {
        chatGroups[msg.chat_id] = {
          count: 0,
          hasMetadata: false,
          hasArtifacts: false,
          lastMessage: msg.created_at
        }
      }
      chatGroups[msg.chat_id].count++
      
      if (msg.metadata) {
        chatGroups[msg.chat_id].hasMetadata = true
        if (msg.metadata.artifacts) {
          chatGroups[msg.chat_id].hasArtifacts = true
        }
      }
    })
    
    console.log(`📊 Total de chats únicos encontrados: ${Object.keys(chatGroups).length}`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    // Mostrar cada chat
    Object.entries(chatGroups)
      .sort(([,a], [,b]) => new Date(b.lastMessage) - new Date(a.lastMessage))
      .forEach(([chatId, info], index) => {
        console.log(`\n💬 CHAT ${index + 1}: ${chatId}`)
        console.log(`   📨 Mensagens: ${info.count}`)
        console.log(`   📦 Metadata: ${info.hasMetadata ? '✅' : '❌'}`)
        console.log(`   🎯 Artifacts: ${info.hasArtifacts ? '✅' : '❌'}`)
        console.log(`   🕐 Última: ${info.lastMessage}`)
        
        if (info.hasArtifacts) {
          console.log(`   🎉 *** ESTE CHAT TEM ARTIFACTS - USAR PARA DEBUG! ***`)
        }
      })
    
  } catch (error) {
    console.error('💥 ERRO:', error)
  }
}

listChats().then(() => {
  console.log('\n🏁 Listagem concluída!')
  process.exit(0)
}).catch(error => {
  console.error('💥 ERRO FINAL:', error)
  process.exit(1)
})