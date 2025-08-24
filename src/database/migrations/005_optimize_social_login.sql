-- ✅ OTIMIZAÇÃO: Stored procedure para social login otimizado
-- Esta procedure reduz múltiplas queries em uma única operação atômica

CREATE OR REPLACE FUNCTION handle_social_login_optimized(
  p_user_id uuid,
  p_email text,
  p_name text,
  p_avatar text,
  p_provider text
) RETURNS TABLE(
  profile_data jsonb,
  usage_data jsonb,
  is_new_user boolean
) AS $$
DECLARE
  v_profile profiles%ROWTYPE;
  v_is_new_user boolean := false;
  v_usage_info jsonb;
BEGIN
  -- ✅ STEP 1: Buscar ou criar perfil do usuário
  SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    -- Usuário novo - criar perfil
    v_is_new_user := true;
    
    INSERT INTO profiles (
      id, name, email, avatar, subscription, preferences,
      created_at, updated_at
    ) VALUES (
      p_user_id,
      COALESCE(p_name, split_part(p_email, '@', 1)),
      p_email,
      p_avatar,
      'starter',
      jsonb_build_object(
        'defaultIndustry', null,
        'defaultTone', 'profissional', 
        'emailSignature', null
      ),
      NOW(),
      NOW()
    ) RETURNING * INTO v_profile;
    
  ELSE
    -- Usuário existente - atualizar avatar se necessário
    IF p_avatar IS NOT NULL AND p_avatar != COALESCE(v_profile.avatar, '') THEN
      UPDATE profiles 
      SET avatar = p_avatar, updated_at = NOW()
      WHERE id = p_user_id
      RETURNING * INTO v_profile;
    END IF;
  END IF;
  
  -- ✅ STEP 2: Buscar informações de uso em uma query otimizada
  SELECT jsonb_build_object(
    'usage', jsonb_build_object(
      'available', GREATEST(0, 
        CASE v_profile.subscription
          WHEN 'free' THEN 50
          WHEN 'starter' THEN 500
          WHEN 'enterprise' THEN 5000
          ELSE -1
        END - COALESCE(monthly_usage.total_used, 0)
      ),
      'used', COALESCE(monthly_usage.total_used, 0),
      'total', CASE v_profile.subscription
        WHEN 'free' THEN 50
        WHEN 'starter' THEN 500
        WHEN 'enterprise' THEN 5000
        ELSE -1
      END,
      'unlimited', (v_profile.subscription = 'unlimited')
    ),
    'billing', jsonb_build_object(
      'currentPeriodEnd', (DATE_TRUNC('month', NOW()) + INTERVAL '1 month')::text
    )
  ) INTO v_usage_info
  FROM (
    SELECT COUNT(*) as total_used
    FROM ai_requests 
    WHERE user_id = p_user_id 
    AND created_at >= DATE_TRUNC('month', NOW())
    AND status = 'completed'
  ) as monthly_usage;
  
  -- ✅ STEP 3: Retornar dados estruturados
  RETURN QUERY SELECT
    row_to_json(v_profile)::jsonb as profile_data,
    v_usage_info as usage_data,
    v_is_new_user as is_new_user;
    
END;
$$ LANGUAGE plpgsql;

-- ✅ ÍNDICES OTIMIZADOS para melhor performance

-- Índice principal para profiles (social login)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_social_login_optimized 
ON profiles(id, email, subscription, avatar) 
WHERE id IS NOT NULL;

-- Índice para consultas de usage mensal
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_requests_monthly_usage_optimized
ON ai_requests(user_id, created_at, status)
WHERE status = 'completed';

-- ✅ ÍNDICES ADICIONAIS para auth flow otimizado

-- Índice para refresh tokens (verificação rápida)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_refresh_tokens_user_active
ON user_refresh_tokens(user_id, is_revoked, expires_at)
WHERE is_revoked = false;

-- Índice para refresh tokens por token (lookup rápido)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_refresh_tokens_token_lookup
ON user_refresh_tokens(token)
WHERE is_revoked = false;

-- Índice para limpeza de tokens expirados
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_refresh_tokens_cleanup
ON user_refresh_tokens(expires_at, is_revoked)
WHERE expires_at < NOW() OR is_revoked = true;

-- ✅ ÍNDICES para IP tracking (se necessário otimizar)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ip_tracking_user_recent
ON user_ip_logs(user_id, created_at)
WHERE created_at > NOW() - INTERVAL '30 days';

-- ✅ ÍNDICES para projetos (melhorar dashboard load)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_user_folder_optimized
ON projects(user_id, folder_id, updated_at)
WHERE organization_id IS NULL;

-- Índice para contagem rápida de projetos por usuário
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_user_count
ON projects(user_id)
WHERE organization_id IS NULL;

-- ✅ ANÁLISE DE PERFORMANCE: Verificar statisticas
ANALYZE profiles;
ANALYZE user_refresh_tokens;
ANALYZE ai_requests;
ANALYZE projects;

-- ✅ FUNÇÃO auxiliar para limpeza de refresh tokens expirados (async)
CREATE OR REPLACE FUNCTION cleanup_expired_refresh_tokens_async(p_user_id uuid)
RETURNS void AS $$
BEGIN
  -- Remover tokens expirados
  DELETE FROM user_refresh_tokens 
  WHERE user_id = p_user_id 
  AND (expires_at < NOW() OR is_revoked = true);
  
  -- Manter apenas os 5 mais recentes
  DELETE FROM user_refresh_tokens 
  WHERE user_id = p_user_id
  AND id NOT IN (
    SELECT id FROM user_refresh_tokens
    WHERE user_id = p_user_id AND is_revoked = false
    ORDER BY created_at DESC
    LIMIT 5
  );
END;
$$ LANGUAGE plpgsql;

-- ✅ GRANT permissions
GRANT EXECUTE ON FUNCTION handle_social_login_optimized TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_refresh_tokens_async TO authenticated;