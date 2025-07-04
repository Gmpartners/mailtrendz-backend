
-- MIGRAÇÃO MANUAL - EXECUTE NO DASHBOARD DO SUPABASE
-- URL: https://kuhlihvgocoxscouzmeg.supabase.co/project/kuhlihvgocoxscouzmeg/sql

-- 1. Adicionar coluna email em profiles (se não existir)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. Adicionar coluna project_id em chats (se não existir)  
ALTER TABLE public.chats ADD COLUMN IF NOT EXISTS project_id UUID;

-- 3. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_chats_project_id ON public.chats(project_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- 4. Adicionar foreign key constraint
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'chats_project_id_fkey'
  ) THEN
    ALTER TABLE public.chats 
    ADD CONSTRAINT chats_project_id_fkey 
    FOREIGN KEY (project_id) 
    REFERENCES public.projects(id) 
    ON DELETE CASCADE;
  END IF;
END $$;

-- 5. Verificação final
SELECT 'profiles.email' as check_name, 
       CASE WHEN EXISTS (
         SELECT 1 FROM information_schema.columns 
         WHERE table_name = 'profiles' AND column_name = 'email'
       ) THEN 'EXISTS' ELSE 'MISSING' END as status

UNION ALL

SELECT 'chats.project_id' as check_name,
       CASE WHEN EXISTS (
         SELECT 1 FROM information_schema.columns 
         WHERE table_name = 'chats' AND column_name = 'project_id'
       ) THEN 'EXISTS' ELSE 'MISSING' END as status;
