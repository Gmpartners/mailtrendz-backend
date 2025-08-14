-- Migration: Flexible IP Tracking for Social Login
-- Created: 2025-08-02
-- Purpose: Allow flexible IP tracking for social logins while maintaining security

-- 1. Adicionar coluna provider na tabela user_ip_tracking
ALTER TABLE user_ip_tracking 
ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'email';

-- 2. Criar função para validar login considerando provider
CREATE OR REPLACE FUNCTION public.validate_login_ip(
    p_user_id UUID,
    p_ip_address INET,
    p_provider TEXT DEFAULT 'email'
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_existing_user_id UUID;
    v_is_blacklisted BOOLEAN;
    v_blacklist_reason TEXT;
BEGIN
    -- Verificar blacklist primeiro
    SELECT TRUE, reason INTO v_is_blacklisted, v_blacklist_reason
    FROM ip_blacklist
    WHERE ip_address = p_ip_address
    AND (expires_at IS NULL OR expires_at > NOW())
    LIMIT 1;
    
    IF v_is_blacklisted THEN
        RETURN jsonb_build_object(
            'allowed', FALSE,
            'reason', v_blacklist_reason
        );
    END IF;
    
    -- Para login social, permitir múltiplos usuários por IP
    IF p_provider != 'email' THEN
        RETURN jsonb_build_object(
            'allowed', TRUE,
            'provider', p_provider,
            'message', 'Social login allowed'
        );
    END IF;
    
    -- Para login com email, verificar se IP já está em uso
    SELECT user_id INTO v_existing_user_id
    FROM user_ip_tracking
    WHERE ip_address = p_ip_address
    AND user_id != p_user_id
    AND provider = 'email'
    LIMIT 1;
    
    IF v_existing_user_id IS NOT NULL THEN
        -- Adicionar ao blacklist temporariamente
        INSERT INTO ip_blacklist (ip_address, reason, expires_at, auto_blocked)
        VALUES (
            p_ip_address,
            'Multiple email accounts attempted from same IP',
            NOW() + INTERVAL '1 hour',
            TRUE
        )
        ON CONFLICT (ip_address) DO UPDATE SET
            expires_at = NOW() + INTERVAL '1 hour',
            violation_count = ip_blacklist.violation_count + 1;
        
        RETURN jsonb_build_object(
            'allowed', FALSE,
            'reason', 'IP already in use by another account'
        );
    END IF;
    
    RETURN jsonb_build_object(
        'allowed', TRUE,
        'provider', p_provider
    );
END;
$$;

-- 3. Criar trigger para registrar IP após login bem-sucedido
CREATE OR REPLACE FUNCTION public.track_user_login()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_ip_address INET;
    v_user_agent TEXT;
    v_provider TEXT;
BEGIN
    -- Extrair informações do contexto (se disponível)
    v_ip_address := current_setting('request.ip', TRUE)::INET;
    v_user_agent := current_setting('request.user_agent', TRUE);
    v_provider := current_setting('request.provider', TRUE);
    
    -- Se não tiver IP no contexto, pular
    IF v_ip_address IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Inserir ou atualizar tracking
    INSERT INTO user_ip_tracking (
        user_id,
        ip_address,
        user_agent,
        provider,
        last_seen,
        login_count
    ) VALUES (
        NEW.user_id,
        v_ip_address,
        v_user_agent,
        COALESCE(v_provider, 'email'),
        NOW(),
        1
    )
    ON CONFLICT (user_id, ip_address) DO UPDATE SET
        last_seen = NOW(),
        login_count = user_ip_tracking.login_count + 1,
        user_agent = EXCLUDED.user_agent;
    
    -- Log da ação
    INSERT INTO admin_logs (action_type, user_id, ip_address, details)
    VALUES (
        'user_login_tracked',
        NEW.user_id,
        v_ip_address,
        jsonb_build_object(
            'provider', COALESCE(v_provider, 'email'),
            'user_agent', v_user_agent
        )
    );
    
    RETURN NEW;
END;
$$;

-- 4. Criar índice para melhorar performance
CREATE INDEX IF NOT EXISTS idx_user_ip_tracking_provider 
ON user_ip_tracking(provider);

-- 5. Atualizar registros existentes
UPDATE user_ip_tracking 
SET provider = 'email' 
WHERE provider IS NULL;

-- 6. Adicionar comentários
COMMENT ON COLUMN user_ip_tracking.provider IS 'Authentication provider: email, google, github, etc';
COMMENT ON FUNCTION validate_login_ip IS 'Validates if an IP can be used for login, with flexible rules for social providers';