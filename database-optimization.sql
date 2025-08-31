-- 🔧 PLANO COMPLETO DE OTIMIZAÇÃO DO SUPABASE
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
-- Adicionar colunas essenciais que estavam no código mas faltavam no DB
ALTER TABLE chats 
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS context JSONB DEFAULT '{}'::jsonb;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_chats_user_id ON chats(user_id);
CREATE INDEX IF NOT EXISTS idx_chats_project_id ON chats(project_id);
CREATE INDEX IF NOT EXISTS idx_chats_created_at ON chats(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chats_user_active ON chats(user_id, is_active) WHERE is_active = true;

-- ========================================
-- 3. OTIMIZAR TABELA MESSAGES
-- ========================================
-- Criar índices otimizados para busca de HTML
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_role_created ON messages(role, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_html_artifacts ON messages USING gin(artifacts) WHERE artifacts->>'type' = 'html';
CREATE INDEX IF NOT EXISTS idx_messages_chat_role ON messages(chat_id, role, created_at DESC);

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
           (artifacts->>'type' = 'text' AND artifacts->>'content' LIKE '%<html%'))
    ORDER BY created_at DESC
    LIMIT 1;
    
    RETURN html_content;
END;
$$;

-- ========================================
-- 5. LIMPEZA E OTIMIZAÇÃO
-- ========================================
-- Remover mensagens órfãs (sem chat válido)
DELETE FROM messages 
WHERE chat_id IS NULL OR 
      chat_id NOT IN (SELECT id FROM chats);

-- Remover chats sem user válido
DELETE FROM chats 
WHERE user_id IS NULL OR 
      user_id NOT IN (SELECT id FROM auth.users);

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
    COUNT(CASE WHEN m.artifacts->>'type' = 'html' THEN 1 END) as html_messages,
    MAX(CASE WHEN m.artifacts->>'type' = 'html' THEN m.created_at END) as last_html_at
FROM chats c
LEFT JOIN messages m ON c.id = m.chat_id
GROUP BY c.id, c.title, c.user_id, c.project_id, c.created_at;

-- ========================================
-- 7. RLS (ROW LEVEL SECURITY) POLICIES
-- ========================================
-- Garantir que usuários só vejam seus próprios chats
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;

-- Policy para chats: usuários só veem seus próprios
DROP POLICY IF EXISTS "Users can view own chats" ON chats;
CREATE POLICY "Users can view own chats" ON chats
    FOR ALL USING (auth.uid() = user_id);

-- Policy para messages: baseada no chat_id
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view messages from own chats" ON messages;
CREATE POLICY "Users can view messages from own chats" ON messages
    FOR ALL USING (
        chat_id IN (
            SELECT id FROM chats WHERE user_id = auth.uid()
        )
    );

-- ========================================
-- 8. TRIGGERS PARA MANUTENÇÃO AUTOMÁTICA
-- ========================================
-- Trigger para atualizar updated_at em chats
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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
        COUNT(CASE WHEN artifacts IS NOT NULL AND artifacts->>'type' NOT IN ('html', 'text') THEN 1 END) as other_artifacts
    FROM messages;
END;
$$;

-- ========================================
-- 10. VERIFICAÇÕES FINAIS
-- ========================================
-- Query para verificar o resultado das otimizações
SELECT 'Otimização concluída!' as status;

-- Estatísticas pós-otimização
SELECT * FROM get_artifacts_stats();

-- Verificar índices criados
SELECT 
    indexname,
    tablename,
    indexdef
FROM pg_indexes 
WHERE tablename IN ('chats', 'messages')
  AND schemaname = 'public'
ORDER BY tablename, indexname;