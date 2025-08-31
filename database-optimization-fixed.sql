-- 🔧 PLANO COMPLETO DE OTIMIZAÇÃO DO SUPABASE - VERSÃO CORRIGIDA
-- Execute esses SQLs sequencialmente no Query Editor do Supabase

-- ========================================
-- 1. CORRIGIR ARTIFACTS EXISTENTES
-- ========================================
-- Atualizar todos os artifacts com type 'text' que contêm HTML para type 'html'
UPDATE messages 
SET artifacts = jsonb_set(
  artifacts, 
  '{type}', 
  '"html"'::jsonb
)
WHERE artifacts IS NOT NULL 
  AND artifacts->>'type' = 'text'
  AND (
    artifacts->>'content' LIKE '%<html%' OR 
    artifacts->>'content' LIKE '%<!DOCTYPE%' OR
    artifacts->>'content' LIKE '%<body%'
  );

-- ========================================
-- 2. OTIMIZAR TABELA CHATS
-- ========================================
-- Verificar se colunas existem antes de adicionar
DO $$ 
BEGIN
  -- Adicionar project_id se não existir
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chats' AND column_name = 'project_id') THEN
    ALTER TABLE chats ADD COLUMN project_id UUID;
  END IF;
  
  -- Adicionar is_active se não existir
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chats' AND column_name = 'is_active') THEN
    ALTER TABLE chats ADD COLUMN is_active BOOLEAN DEFAULT true;
  END IF;
  
  -- Adicionar context se não existir
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chats' AND column_name = 'context') THEN
    ALTER TABLE chats ADD COLUMN context JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- ========================================
-- 3. CRIAR ÍNDICES (SEM DUPLICAR)
-- ========================================
-- Índices para chats (só criar se não existir)
CREATE INDEX IF NOT EXISTS idx_chats_user_id_new ON chats(user_id);
CREATE INDEX IF NOT EXISTS idx_chats_project_id ON chats(project_id);
CREATE INDEX IF NOT EXISTS idx_chats_created_at_desc ON chats(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chats_user_active ON chats(user_id, is_active) WHERE is_active = true;

-- Índices para messages (evitar duplicar os existentes)
CREATE INDEX IF NOT EXISTS idx_messages_role_created ON messages(role, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_chat_role ON messages(chat_id, role, created_at DESC);

-- Índice GIN para artifacts (principal correção)
CREATE INDEX IF NOT EXISTS idx_messages_html_artifacts 
ON messages USING gin(artifacts) 
WHERE artifacts IS NOT NULL;

-- ========================================
-- 4. FUNCTION: BUSCAR ÚLTIMO HTML DO CHAT
-- ========================================
CREATE OR REPLACE FUNCTION get_latest_html_from_chat(chat_uuid UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    html_content TEXT;
BEGIN
    -- Buscar o HTML mais recente do chat
    SELECT artifacts->>'content' INTO html_content
    FROM messages
    WHERE chat_id = chat_uuid
      AND role = 'assistant'
      AND artifacts IS NOT NULL
      AND (artifacts->>'type' = 'html' OR 
           (artifacts->>'type' = 'text' AND 
            (artifacts->>'content' LIKE '%<html%' OR 
             artifacts->>'content' LIKE '%<!DOCTYPE%' OR
             artifacts->>'content' LIKE '%<body%')))
    ORDER BY created_at DESC
    LIMIT 1;
    
    RETURN html_content;
END;
$$;

-- ========================================
-- 5. LIMPEZA DE DADOS ÓRFÃOS
-- ========================================
-- Contar antes da limpeza
SELECT 
  'Antes da limpeza:' as status,
  (SELECT COUNT(*) FROM messages WHERE chat_id IS NULL OR chat_id NOT IN (SELECT id FROM chats)) as mensagens_orfas,
  (SELECT COUNT(*) FROM chats WHERE user_id IS NULL OR user_id NOT IN (SELECT id FROM auth.users)) as chats_orfaos;

-- Remover mensagens órfãs (sem chat válido)
DELETE FROM messages 
WHERE chat_id IS NULL OR 
      chat_id NOT IN (SELECT id FROM chats);

-- Remover chats sem user válido
DELETE FROM chats 
WHERE user_id IS NULL OR 
      user_id NOT IN (SELECT id FROM auth.users);

-- Contar após limpeza
SELECT 
  'Após limpeza:' as status,
  (SELECT COUNT(*) FROM messages WHERE chat_id IS NULL OR chat_id NOT IN (SELECT id FROM chats)) as mensagens_orfas,
  (SELECT COUNT(*) FROM chats WHERE user_id IS NULL OR user_id NOT IN (SELECT id FROM auth.users)) as chats_orfaos;

-- ========================================
-- 6. VIEWS OTIMIZADAS
-- ========================================
-- View para estatísticas de chats com HTML
CREATE OR REPLACE VIEW chat_html_stats AS
SELECT 
    c.id as chat_id,
    c.title,
    c.user_id,
    c.project_id,
    c.created_at,
    COUNT(m.id) as total_messages,
    COUNT(CASE WHEN m.artifacts->>'type' IN ('html', 'text') 
               AND (m.artifacts->>'content' LIKE '%<html%' OR 
                    m.artifacts->>'content' LIKE '%<!DOCTYPE%' OR
                    m.artifacts->>'content' LIKE '%<body%') 
               THEN 1 END) as html_messages,
    MAX(CASE WHEN m.artifacts->>'type' IN ('html', 'text') 
             AND (m.artifacts->>'content' LIKE '%<html%' OR 
                  m.artifacts->>'content' LIKE '%<!DOCTYPE%' OR
                  m.artifacts->>'content' LIKE '%<body%') 
             THEN m.created_at END) as last_html_at
FROM chats c
LEFT JOIN messages m ON c.id = m.chat_id
GROUP BY c.id, c.title, c.user_id, c.project_id, c.created_at;

-- ========================================
-- 7. RLS (ROW LEVEL SECURITY) POLICIES
-- ========================================
-- Habilitar RLS se não estiver
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Remover policies antigas se existirem
DROP POLICY IF EXISTS "Users can view own chats" ON chats;
DROP POLICY IF EXISTS "Users can insert own chats" ON chats;
DROP POLICY IF EXISTS "Users can update own chats" ON chats;
DROP POLICY IF EXISTS "Users can delete own chats" ON chats;

-- Policies para chats
CREATE POLICY "Users can view own chats" ON chats
    FOR SELECT USING (auth.uid() = user_id);
    
CREATE POLICY "Users can insert own chats" ON chats
    FOR INSERT WITH CHECK (auth.uid() = user_id);
    
CREATE POLICY "Users can update own chats" ON chats
    FOR UPDATE USING (auth.uid() = user_id);
    
CREATE POLICY "Users can delete own chats" ON chats
    FOR DELETE USING (auth.uid() = user_id);

-- Remover policies antigas de messages
DROP POLICY IF EXISTS "Users can view messages from own chats" ON messages;
DROP POLICY IF EXISTS "Users can insert messages in own chats" ON messages;
DROP POLICY IF EXISTS "Users can update messages in own chats" ON messages;
DROP POLICY IF EXISTS "Users can delete messages in own chats" ON messages;

-- Policies para messages
CREATE POLICY "Users can view messages from own chats" ON messages
    FOR SELECT USING (
        chat_id IN (SELECT id FROM chats WHERE user_id = auth.uid())
    );
    
CREATE POLICY "Users can insert messages in own chats" ON messages
    FOR INSERT WITH CHECK (
        chat_id IN (SELECT id FROM chats WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can update messages in own chats" ON messages
    FOR UPDATE USING (
        chat_id IN (SELECT id FROM chats WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can delete messages in own chats" ON messages
    FOR DELETE USING (
        chat_id IN (SELECT id FROM chats WHERE user_id = auth.uid())
    );

-- ========================================
-- 8. TRIGGERS PARA MANUTENÇÃO AUTOMÁTICA
-- ========================================
-- Function para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para chats
DROP TRIGGER IF EXISTS update_chats_updated_at ON chats;
CREATE TRIGGER update_chats_updated_at
    BEFORE UPDATE ON chats
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 9. FUNCTION: ESTATÍSTICAS DE ARTIFACTS
-- ========================================
CREATE OR REPLACE FUNCTION get_artifacts_stats()
RETURNS TABLE(
    total_messages BIGINT,
    messages_with_artifacts BIGINT,
    html_artifacts BIGINT,
    text_artifacts BIGINT,
    text_with_html_content BIGINT,
    other_artifacts BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_messages,
        COUNT(CASE WHEN artifacts IS NOT NULL THEN 1 END) as messages_with_artifacts,
        COUNT(CASE WHEN artifacts->>'type' = 'html' THEN 1 END) as html_artifacts,
        COUNT(CASE WHEN artifacts->>'type' = 'text' THEN 1 END) as text_artifacts,
        COUNT(CASE WHEN artifacts->>'type' = 'text' 
                   AND (artifacts->>'content' LIKE '%<html%' OR 
                        artifacts->>'content' LIKE '%<!DOCTYPE%' OR
                        artifacts->>'content' LIKE '%<body%')
                   THEN 1 END) as text_with_html_content,
        COUNT(CASE WHEN artifacts IS NOT NULL 
                   AND artifacts->>'type' NOT IN ('html', 'text') 
                   THEN 1 END) as other_artifacts
    FROM messages;
END;
$$;

-- ========================================
-- 10. FUNCTION: TESTAR DETECÇÃO DE HTML
-- ========================================
CREATE OR REPLACE FUNCTION test_html_detection()
RETURNS TABLE(
    message_id UUID,
    chat_id UUID,
    artifact_type TEXT,
    has_html_content BOOLEAN,
    content_preview TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id as message_id,
        m.chat_id,
        m.artifacts->>'type' as artifact_type,
        (m.artifacts->>'content' LIKE '%<html%' OR 
         m.artifacts->>'content' LIKE '%<!DOCTYPE%' OR
         m.artifacts->>'content' LIKE '%<body%') as has_html_content,
        LEFT(m.artifacts->>'content', 100) as content_preview
    FROM messages m
    WHERE m.artifacts IS NOT NULL
      AND m.role = 'assistant'
    ORDER BY m.created_at DESC
    LIMIT 10;
END;
$$;

-- ========================================
-- 11. VERIFICAÇÕES FINAIS
-- ========================================
-- Estatísticas pós-otimização
SELECT 'Otimização concluída!' as status;
SELECT * FROM get_artifacts_stats();

-- Testar detecção de HTML
SELECT 'Testando detecção de HTML:' as status;
SELECT * FROM test_html_detection();

-- Verificar índices criados
SELECT 
    'Índices da tabela ' || tablename as tabela,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename IN ('chats', 'messages')
  AND schemaname = 'public'
ORDER BY tablename, indexname;

-- Verificar RLS
SELECT 
    'RLS Status:' as info,
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('chats', 'messages')
  AND schemaname = 'public';