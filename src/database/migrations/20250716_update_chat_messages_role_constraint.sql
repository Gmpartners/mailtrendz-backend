-- Remover constraint antiga
ALTER TABLE chat_messages 
DROP CONSTRAINT IF EXISTS chat_messages_role_check;

-- Adicionar nova constraint incluindo 'ai'
ALTER TABLE chat_messages 
ADD CONSTRAINT chat_messages_role_check 
CHECK (role = ANY (ARRAY['user'::text, 'ai'::text, 'assistant'::text, 'system'::text]));

-- Comentário para documentação
COMMENT ON CONSTRAINT chat_messages_role_check ON chat_messages IS 
'Validação dos tipos de role permitidos para mensagens do chat. Inclui: user (usuário), ai/assistant (IA), system (sistema)';