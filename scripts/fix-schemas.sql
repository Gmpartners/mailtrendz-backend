-- ✅ MAILTRENDZ - CORREÇÃO DE SCHEMAS DA FASE 1
-- Corrigindo problemas críticos de schema identificados nos logs

-- =============================================
-- 1. CORRIGIR TABELA PROFILES - ADICIONAR EMAIL
-- =============================================

-- Verificar se a coluna email já existe na tabela profiles
DO $$
BEGIN
    -- Tentar adicionar a coluna email se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'email'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN email TEXT;
        RAISE NOTICE '✅ Coluna email adicionada à tabela profiles';
    ELSE
        RAISE NOTICE '⚠️ Coluna email já existe na tabela profiles';
    END IF;
END $$;

-- Tornar a coluna email obrigatória e única
ALTER TABLE public.profiles 
    ALTER COLUMN email SET NOT NULL,
    ADD CONSTRAINT profiles_email_unique UNIQUE (email);

-- =============================================
-- 2. CORRIGIR TABELA CHATS - ADICIONAR PROJECT_ID
-- =============================================

-- Verificar se a coluna project_id já existe na tabela chats
DO $$
BEGIN
    -- Tentar adicionar a coluna project_id se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'chats' 
        AND column_name = 'project_id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.chats ADD COLUMN project_id UUID;
        RAISE NOTICE '✅ Coluna project_id adicionada à tabela chats';
    ELSE
        RAISE NOTICE '⚠️ Coluna project_id já existe na tabela chats';
    END IF;
END $$;

-- Adicionar referência de chave estrangeira para projects
ALTER TABLE public.chats 
    ADD CONSTRAINT chats_project_id_fkey 
    FOREIGN KEY (project_id) 
    REFERENCES public.projects(id) 
    ON DELETE CASCADE;

-- =============================================
-- 3. CRIAR ÍNDICES PARA PERFORMANCE
-- =============================================

-- Índice para buscar chats por projeto
CREATE INDEX IF NOT EXISTS idx_chats_project_id ON public.chats(project_id);

-- Índice para buscar profiles por email
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- =============================================
-- 4. ATUALIZAR RLS POLICIES SE NECESSÁRIO
-- =============================================

-- Verificar se existem políticas RLS para chats
DO $$
BEGIN
    -- Permitir que usuários vejam apenas seus próprios chats
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'chats' 
        AND policyname = 'Users can view own chats'
    ) THEN
        CREATE POLICY "Users can view own chats" ON public.chats
            FOR SELECT USING (auth.uid() = user_id);
        RAISE NOTICE '✅ Política RLS criada para SELECT em chats';
    END IF;

    -- Permitir que usuários criem chats
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'chats' 
        AND policyname = 'Users can create own chats'
    ) THEN
        CREATE POLICY "Users can create own chats" ON public.chats
            FOR INSERT WITH CHECK (auth.uid() = user_id);
        RAISE NOTICE '✅ Política RLS criada para INSERT em chats';
    END IF;

    -- Permitir que usuários atualizem seus chats
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'chats' 
        AND policyname = 'Users can update own chats'
    ) THEN
        CREATE POLICY "Users can update own chats" ON public.chats
            FOR UPDATE USING (auth.uid() = user_id);
        RAISE NOTICE '✅ Política RLS criada para UPDATE em chats';
    END IF;

    -- Permitir que usuários deletem seus chats
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'chats' 
        AND policyname = 'Users can delete own chats'
    ) THEN
        CREATE POLICY "Users can delete own chats" ON public.chats
            FOR DELETE USING (auth.uid() = user_id);
        RAISE NOTICE '✅ Política RLS criada para DELETE em chats';
    END IF;
END $$;

-- =============================================
-- 5. VERIFICAÇÃO FINAL
-- =============================================

-- Verificar estruturas criadas
SELECT 
    'profiles' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'profiles' 
    AND table_schema = 'public'
    AND column_name = 'email'

UNION ALL

SELECT 
    'chats' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'chats' 
    AND table_schema = 'public'
    AND column_name = 'project_id';

-- Mensagem final
DO $$
BEGIN
    RAISE NOTICE '🎯 CORREÇÃO DE SCHEMAS CONCLUÍDA!';
    RAISE NOTICE '✅ Tabela profiles: coluna email adicionada';
    RAISE NOTICE '✅ Tabela chats: coluna project_id adicionada';
    RAISE NOTICE '✅ Índices criados para performance';
    RAISE NOTICE '✅ Políticas RLS configuradas';
    RAISE NOTICE '🚀 Backend deve estar funcionando agora!';
END $$;
