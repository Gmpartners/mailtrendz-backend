const { getSupabaseWithAuth } = require('./src/config/supabase.config');

async function testHTMLFix() {
    console.log('🔍 Testando correção do sistema de HTML...\n');
    
    try {
        const supabase = getSupabaseWithAuth();
        
        // 1. Verificar estrutura da tabela messages
        console.log('1️⃣ Verificando estrutura da tabela messages...');
        const { data: columns, error: columnsError } = await supabase.rpc('pg_get_table_columns', { table_name: 'messages' });
        
        if (columnsError) {
            console.log('❌ Erro ao verificar colunas:', columnsError.message);
        } else {
            console.log('✅ Colunas da tabela messages:', columns?.map(c => c.column_name));
        }
        
        // 2. Buscar mensagens recentes com artifacts
        console.log('\n2️⃣ Buscando mensagens com artifacts...');
        const { data: messages, error: messagesError } = await supabase
            .from('messages')
            .select('id, role, content, artifacts, created_at')
            .not('artifacts', 'is', null)
            .order('created_at', { ascending: false })
            .limit(5);
            
        if (messagesError) {
            console.log('❌ Erro ao buscar messages:', messagesError.message);
        } else {
            console.log(`✅ Encontradas ${messages?.length || 0} mensagens com artifacts`);
            
            messages?.forEach((msg, i) => {
                console.log(`\n📄 Mensagem ${i + 1}:`);
                console.log(`   ID: ${msg.id}`);
                console.log(`   Role: ${msg.role}`);
                console.log(`   Content: ${msg.content.substring(0, 50)}...`);
                console.log(`   Artifacts Type: ${msg.artifacts?.type || 'N/A'}`);
                console.log(`   Has HTML: ${JSON.stringify(msg.artifacts).includes('<html') ? 'SIM' : 'NÃO'}`);
            });
        }
        
        // 3. Testar busca de HTML
        console.log('\n3️⃣ Testando extração de HTML dos artifacts...');
        if (messages && messages.length > 0) {
            for (const msg of messages) {
                const htmlContent = extractHTMLFromArtifacts(msg.artifacts);
                if (htmlContent) {
                    console.log(`✅ HTML encontrado na mensagem ${msg.id} (${htmlContent.length} caracteres)`);
                    break;
                }
            }
        }
        
        console.log('\n✅ Teste completo!');
        
    } catch (error) {
        console.error('❌ Erro no teste:', error.message);
    }
}

// Função auxiliar para testar extração de HTML
function extractHTMLFromArtifacts(artifacts) {
    if (!artifacts) {
        return null;
    }
    
    try {
        // Caso 1: artifacts é um objeto direto com content
        if (artifacts.type === 'html' && artifacts.content) {
            const content = artifacts.content;
            if (content.includes('<html') || content.includes('<!DOCTYPE')) {
                return content;
            }
        }
        
        // Caso 2: artifacts é um array de objetos
        if (Array.isArray(artifacts)) {
            for (const artifact of artifacts) {
                if (artifact.type === 'html' && artifact.content) {
                    const content = artifact.content;
                    if (content.includes('<html') || content.includes('<!DOCTYPE')) {
                        return content;
                    }
                }
            }
        }
        
        // Caso 3: buscar HTML em qualquer lugar do artifacts (string search)
        const artifactsStr = JSON.stringify(artifacts);
        const htmlMatch = artifactsStr.match(/<html[\s\S]*?<\/html>/i);
        if (htmlMatch) {
            return htmlMatch[0].replace(/\\"/g, '"').replace(/\\n/g, '\n');
        }
        
        return null;
        
    } catch (error) {
        console.error('❌ Erro ao extrair HTML dos artifacts:', error.message);
        return null;
    }
}

// Executar teste
if (require.main === module) {
    testHTMLFix().catch(console.error);
}

module.exports = { testHTMLFix };