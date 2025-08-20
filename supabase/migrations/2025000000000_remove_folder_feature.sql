-- =====================================================
-- MIGRATION: REMOÇÃO COMPLETA DA FEATURE DE PASTAS
-- Data: 2025-01-18
-- Descrição: Remove toda funcionalidade de pastas do sistema
-- =====================================================

BEGIN;

-- 1. BACKUP: Salvar dados antes da remoção (para rollback se necessário)
CREATE TABLE IF NOT EXISTS folders_backup AS 
SELECT * FROM folders;

CREATE TABLE IF NOT EXISTS projects_folder_backup AS 
SELECT id, name, folder_id, user_id, created_at 
FROM projects 
WHERE folder_id IS NOT NULL;

-- 2. MOVER PROJETOS: Garantir que projetos em pastas sejam movidos para root
UPDATE projects 
SET folder_id = NULL, 
    updated_at = NOW()
WHERE folder_id IS NOT NULL;

-- 3. REMOVER COLUNAS: folder_id da tabela projects
ALTER TABLE projects DROP COLUMN IF EXISTS folder_id;

-- 4. REMOVER FEATURE FLAGS: has_folders das tabelas de features
ALTER TABLE plan_features DROP COLUMN IF EXISTS has_folders;
ALTER TABLE subscription_state DROP COLUMN IF EXISTS has_folders;
ALTER TABLE admin_subscription_state DROP COLUMN IF EXISTS has_folders;

-- 5. REMOVER VIEWS: Recriar views sem referências a folder_id
DROP VIEW IF EXISTS projects_with_stats CASCADE;
DROP VIEW IF EXISTS safe_projects_with_stats CASCADE;
DROP VIEW IF EXISTS secure_projects_with_stats CASCADE;

-- 6. RECRIAR VIEWS SEM FOLDER_ID
CREATE OR REPLACE VIEW projects_with_stats AS
SELECT 
  p.id,
  p.user_id,
  p.name,
  p.description,
  p.status,
  p.industry,
  p.tone,
  p.target_audience,
  p.goal,
  p.created_at,
  p.updated_at,
  COALESCE(email_count.count, 0) as emails_count,
  COALESCE(chat_count.count, 0) as chats_count,
  (COALESCE(email_count.count, 0) + COALESCE(chat_count.count, 0)) as total_interactions
FROM projects p
LEFT JOIN (
  SELECT project_id, COUNT(*) as count 
  FROM emails 
  GROUP BY project_id
) email_count ON p.id = email_count.project_id
LEFT JOIN (
  SELECT project_id, COUNT(*) as count 
  FROM conversations 
  GROUP BY project_id
) chat_count ON p.id = chat_count.project_id;

-- 7. RECREAR SAFE VIEW
CREATE OR REPLACE VIEW safe_projects_with_stats AS
SELECT 
  id,
  name,
  description,
  status,
  industry,
  tone,
  target_audience,
  goal,
  created_at,
  updated_at,
  emails_count,
  chats_count,
  total_interactions
FROM projects_with_stats;

-- 8. RECREAR SECURE VIEW  
CREATE OR REPLACE VIEW secure_projects_with_stats AS
SELECT * FROM safe_projects_with_stats;

-- 9. REMOVER TABELA: folders (por último)
DROP TABLE IF EXISTS folders CASCADE;

-- 10. ADICIONAR COMENTÁRIOS DE LOG
COMMENT ON TABLE projects IS 'Projetos do sistema - feature de pastas removida em 2025-01-18';
COMMENT ON TABLE folders_backup IS 'Backup da tabela folders antes da remoção - pode ser removido após confirmação';
COMMENT ON TABLE projects_folder_backup IS 'Backup dos projetos que tinham folder_id - pode ser removido após confirmação';

-- 11. LOG DA OPERAÇÃO
DO $$
BEGIN
  RAISE NOTICE '✅ MIGRATION COMPLETED: Folder feature removed successfully';
  RAISE NOTICE '📊 Backed up % folders and % projects with folders', 
    (SELECT COUNT(*) FROM folders_backup),
    (SELECT COUNT(*) FROM projects_folder_backup);
  RAISE NOTICE '🔄 Moved % projects from folders to root level', 
    (SELECT COUNT(*) FROM projects_folder_backup);
  RAISE NOTICE '🗑️ Removed folders table and all folder references';
  RAISE NOTICE '⚠️ Remember to update backend code to remove folder routes/services';
END $$;

COMMIT;