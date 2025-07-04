-- ============================================
-- FIX PARA O ERRO DE LOGIN SOCIAL
-- ============================================

-- 1. Primeiro, vamos verificar se a tabela profiles existe
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE  table_schema = 'public'
   AND    table_name   = 'profiles'
) as profiles_exists;

-- 2. Verificar se o trigger existe
SELECT tgname 
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created';

-- 3. Remover o trigger problemático
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 4. Remover a função antiga
DROP FUNCTION IF EXISTS handle_new_user();

-- 5. Criar uma nova função mais robusta
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Log para debug
  RAISE NOTICE 'Novo usuário criado: %', NEW.email;
  
  -- Verificar se o perfil já existe
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
    RAISE NOTICE 'Perfil já existe para usuário: %', NEW.id;
    RETURN NEW;
  END IF;
  
  -- Tentar inserir o perfil
  BEGIN
    INSERT INTO public.profiles (id, name, avatar, subscription, api_usage_limit, preferences, created_at, updated_at)
    VALUES (
      NEW.id,
      COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        split_part(NEW.email, '@', 1)
      ),
      COALESCE(
        NEW.raw_user_meta_data->>'avatar_url',
        NEW.raw_user_meta_data->>'picture',
        NEW.raw_user_meta_data->>'avatar'
      ),
      'free',
      50,
      '{"defaultIndustry": null, "defaultTone": "profissional", "emailSignature": null}'::jsonb,
      NOW(),
      NOW()
    );
    RAISE NOTICE 'Perfil criado com sucesso para: %', NEW.id;
  EXCEPTION
    WHEN OTHERS THEN
      -- Se falhar, registrar o erro mas não bloquear o login
      RAISE WARNING 'Erro ao criar perfil: % - %', SQLERRM, SQLSTATE;
      -- Não propagar o erro
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Criar o trigger novamente
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 7. Garantir permissões corretas
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO anon, authenticated;

-- 8. Testar se conseguimos inserir manualmente na tabela profiles
DO $$
BEGIN
  -- Tentar inserir um registro de teste
  INSERT INTO public.profiles (id, name, avatar, subscription, api_usage_limit, preferences, created_at, updated_at)
  VALUES (
    gen_random_uuid(),
    'Teste Manual',
    null,
    'free',
    50,
    '{"defaultIndustry": null, "defaultTone": "profissional", "emailSignature": null}'::jsonb,
    NOW(),
    NOW()
  );
  
  -- Se chegou aqui, funcionou
  RAISE NOTICE 'Teste de inserção manual: SUCESSO';
  
  -- Deletar o registro de teste
  DELETE FROM public.profiles WHERE name = 'Teste Manual';
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Teste de inserção manual FALHOU: % - %', SQLERRM, SQLSTATE;
END $$;

-- 9. Verificar configurações do Supabase Auth
SELECT * FROM auth.config LIMIT 1;

-- 10. Mensagem final
DO $$
BEGIN
  RAISE NOTICE '✅ Script de correção executado!';
  RAISE NOTICE '📝 Agora tente fazer login com Google novamente.';
END $$;