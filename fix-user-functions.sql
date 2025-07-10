-- Função SQL para verificar se usuário tem acesso a uma feature
-- Execute no SQL Editor do Supabase

CREATE OR REPLACE FUNCTION user_has_feature(p_user_id UUID, p_feature TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_plan_type TEXT;
BEGIN
    -- Buscar plano do usuário
    SELECT subscription INTO v_plan_type
    FROM profiles
    WHERE id = p_user_id;
    
    -- Se não encontrou, assumir plano free
    IF v_plan_type IS NULL THEN
        v_plan_type := 'free';
    END IF;
    
    -- Verificar features baseado no plano
    CASE p_feature
        WHEN 'has_folders' THEN
            RETURN v_plan_type IN ('enterprise', 'unlimited');
        WHEN 'has_multi_user' THEN
            RETURN v_plan_type IN ('enterprise', 'unlimited');
        WHEN 'has_html_export' THEN
            RETURN v_plan_type IN ('starter', 'enterprise', 'unlimited');
        WHEN 'has_email_preview' THEN
            RETURN v_plan_type IN ('starter', 'enterprise', 'unlimited');
        WHEN 'has_priority_support' THEN
            RETURN v_plan_type IN ('enterprise', 'unlimited');
        ELSE
            RETURN TRUE; -- Features básicas sempre disponíveis
    END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função auxiliar para consumir créditos AI
CREATE OR REPLACE FUNCTION consume_ai_credit(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_current_credits INTEGER;
    v_plan_type TEXT;
BEGIN
    -- Buscar informações do usuário
    SELECT 
        COALESCE(ac.credits_available, 0),
        COALESCE(p.subscription, 'free')
    INTO v_current_credits, v_plan_type
    FROM profiles p
    LEFT JOIN ai_credits ac ON ac.user_id = p.id
    WHERE p.id = p_user_id;
    
    -- Se plano unlimited, sempre permitir
    IF v_plan_type = 'unlimited' THEN
        RETURN TRUE;
    END IF;
    
    -- Se não tem créditos disponíveis
    IF v_current_credits <= 0 THEN
        RETURN FALSE;
    END IF;
    
    -- Consumir um crédito
    UPDATE ai_credits 
    SET 
        credits_available = credits_available - 1,
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    -- Se não existe registro, criar um
    IF NOT FOUND THEN
        INSERT INTO ai_credits (user_id, credits_available, used, total, reset_at)
        VALUES (
            p_user_id,
            CASE v_plan_type
                WHEN 'starter' THEN 19
                WHEN 'enterprise' THEN 49
                ELSE 2
            END,
            1,
            CASE v_plan_type
                WHEN 'starter' THEN 20
                WHEN 'enterprise' THEN 50
                ELSE 3
            END,
            DATE_TRUNC('month', NOW()) + INTERVAL '1 month'
        );
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para inicializar créditos do usuário
CREATE OR REPLACE FUNCTION initialize_user_credits(p_user_id UUID, p_plan_type TEXT DEFAULT 'free')
RETURNS VOID AS $$
DECLARE
    v_credits INTEGER;
BEGIN
    -- Definir créditos baseado no plano
    CASE p_plan_type
        WHEN 'starter' THEN v_credits := 20;
        WHEN 'enterprise' THEN v_credits := 50;
        WHEN 'unlimited' THEN v_credits := -1; -- Ilimitado
        ELSE v_credits := 3; -- Free
    END CASE;
    
    -- Inserir ou atualizar créditos
    INSERT INTO ai_credits (user_id, credits_available, used, total, reset_at)
    VALUES (
        p_user_id,
        CASE WHEN v_credits = -1 THEN 999999 ELSE v_credits END,
        0,
        CASE WHEN v_credits = -1 THEN 999999 ELSE v_credits END,
        DATE_TRUNC('month', NOW()) + INTERVAL '1 month'
    )
    ON CONFLICT (user_id) DO UPDATE SET
        credits_available = CASE WHEN v_credits = -1 THEN 999999 ELSE v_credits END,
        total = CASE WHEN v_credits = -1 THEN 999999 ELSE v_credits END,
        used = 0,
        reset_at = DATE_TRUNC('month', NOW()) + INTERVAL '1 month',
        updated_at = NOW();
    
    -- Também atualizar a tabela user_subscription_info se existir
    INSERT INTO user_subscription_info (
        user_id, plan_type, plan_credits, credits_used, max_projects, api_usage_limit
    )
    VALUES (
        p_user_id,
        p_plan_type,
        CASE WHEN v_credits = -1 THEN 999999 ELSE v_credits END,
        0,
        CASE p_plan_type
            WHEN 'starter' THEN 50
            WHEN 'enterprise' THEN 200
            WHEN 'unlimited' THEN 999999
            ELSE 10
        END,
        CASE p_plan_type
            WHEN 'starter' THEN 500
            WHEN 'enterprise' THEN 5000
            WHEN 'unlimited' THEN 999999
            ELSE 50
        END
    )
    ON CONFLICT (user_id) DO UPDATE SET
        plan_type = p_plan_type,
        plan_credits = CASE WHEN v_credits = -1 THEN 999999 ELSE v_credits END,
        credits_used = 0,
        max_projects = CASE p_plan_type
            WHEN 'starter' THEN 50
            WHEN 'enterprise' THEN 200
            WHEN 'unlimited' THEN 999999
            ELSE 10
        END,
        api_usage_limit = CASE p_plan_type
            WHEN 'starter' THEN 500
            WHEN 'enterprise' THEN 5000
            WHEN 'unlimited' THEN 999999
            ELSE 50
        END,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Testar as funções
SELECT user_has_feature('2d44ce46-d623-411a-a580-1568cc96b198'::UUID, 'has_folders');
SELECT user_has_feature('2d44ce46-d623-411a-a580-1568cc96b198'::UUID, 'has_html_export');
