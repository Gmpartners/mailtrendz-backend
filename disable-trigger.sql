-- ============================================
-- SOLUÇÃO ALTERNATIVA - DESABILITAR TRIGGER
-- ============================================

-- 1. Remover completamente o trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

-- 2. Criar profiles para usuários existentes sem perfil
INSERT INTO public.profiles (id, name, email, avatar, subscription, created_at, updated_at)
SELECT 
  u.id,
  COALESCE(u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)),
  u.email,
  u.raw_user_meta_data->>'avatar_url',
  'free',
  u.created_at,
  NOW()
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL;

-- 3. Verificar quantos usuários e perfis existem
SELECT 
  (SELECT COUNT(*) FROM auth.users) as total_users,
  (SELECT COUNT(*) FROM public.profiles) as total_profiles;

-- 4. Mensagem
DO $$
BEGIN
  RAISE NOTICE '✅ Trigger removido! Agora o login deve funcionar.';
  RAISE NOTICE '⚠️  Perfis precisarão ser criados manualmente pelo backend.';
END $$;