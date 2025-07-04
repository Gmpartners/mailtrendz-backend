-- ✅ MAILTRENDZ - CORREÇÃO DE POLÍTICAS RLS
-- Corrigindo problemas de Row Level Security que impedem criação de dados

-- =============================================
-- 1. CORRIGIR POLÍTICAS DA TABELA PROFILES
-- =============================================

-- Remover políticas restritivas existentes
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- Criar políticas permissivas para profiles
CREATE POLICY "Allow users to view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Allow users to insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Allow users to update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- =============================================
-- 2. CORRIGIR POLÍTICAS DA TABELA PROJECTS
-- =============================================

-- Remover políticas restritivas existentes
DROP POLICY IF EXISTS "Users can view own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can create projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON public.projects;

-- Criar políticas permissivas para projects
CREATE POLICY "Allow users to view own projects" ON public.projects
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Allow users to create projects" ON public.projects
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to update own projects" ON public.projects
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Allow users to delete own projects" ON public.projects
    FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- 3. CORRIGIR POLÍTICAS DA TABELA PROJECT_STATS
-- =============================================

-- Remover políticas restritivas existentes
DROP POLICY IF EXISTS "Users can view project stats" ON public.project_stats;
DROP POLICY IF EXISTS "Users can create project stats" ON public.project_stats;
DROP POLICY IF EXISTS "Users can update project stats" ON public.project_stats;

-- Criar políticas permissivas para project_stats
CREATE POLICY "Allow users to view project stats" ON public.project_stats
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.projects 
            WHERE projects.id = project_stats.project_id 
            AND projects.user_id = auth.uid()
        )
    );

CREATE POLICY "Allow users to create project stats" ON public.project_stats
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.projects 
            WHERE projects.id = project_stats.project_id 
            AND projects.user_id = auth.uid()
        )
    );

CREATE POLICY "Allow users to update project stats" ON public.project_stats
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.projects 
            WHERE projects.id = project_stats.project_id 
            AND projects.user_id = auth.uid()
        )
    );

-- =============================================
-- 4. CORRIGIR POLÍTICAS DA TABELA CHATS
-- =============================================

-- Remover políticas restritivas existentes
DROP POLICY IF EXISTS "Users can view own chats" ON public.chats;
DROP POLICY IF EXISTS "Users can create own chats" ON public.chats;
DROP POLICY IF EXISTS "Users can update own chats" ON public.chats;
DROP POLICY IF EXISTS "Users can delete own chats" ON public.chats;

-- Criar políticas permissivas para chats
CREATE POLICY "Allow users to view own chats" ON public.chats
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Allow users to create own chats" ON public.chats
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to update own chats" ON public.chats
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Allow users to delete own chats" ON public.chats
    FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- 5. CORRIGIR POLÍTICAS DA TABELA CHAT_MESSAGES
-- =============================================

-- Remover políticas restritivas existentes se existirem
DROP POLICY IF EXISTS "Users can view chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can create chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can update chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can delete chat messages" ON public.chat_messages;

-- Criar políticas permissivas para chat_messages
CREATE POLICY "Allow users to view chat messages" ON public.chat_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.chats 
            WHERE chats.id = chat_messages.chat_id 
            AND chats.user_id = auth.uid()
        )
    );

CREATE POLICY "Allow users to create chat messages" ON public.chat_messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.chats 
            WHERE chats.id = chat_messages.chat_id 
            AND chats.user_id = auth.uid()
        )
    );

CREATE POLICY "Allow users to update chat messages" ON public.chat_messages
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.chats 
            WHERE chats.id = chat_messages.chat_id 
            AND chats.user_id = auth.uid()
        )
    );

CREATE POLICY "Allow users to delete chat messages" ON public.chat_messages
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.chats 
            WHERE chats.id = chat_messages.chat_id 
            AND chats.user_id = auth.uid()
        )
    );

-- =============================================
-- 6. VERIFICAR E HABILITAR RLS NAS TABELAS
-- =============================================

-- Garantir que RLS está habilitado (mas com políticas corretas)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 7. VERIFICAÇÃO FINAL
-- =============================================

-- Listar todas as políticas criadas
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, policyname;

-- Mensagem final
DO $$
BEGIN
    RAISE NOTICE '🎯 CORREÇÃO DE POLÍTICAS RLS CONCLUÍDA!';
    RAISE NOTICE '✅ Políticas permissivas criadas para todas as tabelas';
    RAISE NOTICE '✅ Usuários podem criar e gerenciar próprios dados';
    RAISE NOTICE '✅ RLS habilitado com segurança adequada';
    RAISE NOTICE '🚀 Backend deve aceitar criação de profiles e projetos agora!';
END $$;
