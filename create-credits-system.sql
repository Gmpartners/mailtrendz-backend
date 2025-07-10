-- Script para criar tabela de informações de assinatura dos usuários
-- Execute no Supabase SQL Editor se a tabela não existir

CREATE TABLE IF NOT EXISTS user_subscription_info (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_type TEXT NOT NULL DEFAULT 'free',
    plan_credits INTEGER NOT NULL DEFAULT 3,
    credits_used INTEGER NOT NULL DEFAULT 0,
    max_projects INTEGER NOT NULL DEFAULT 3,
    api_usage_limit INTEGER NOT NULL DEFAULT 50,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id)
);

-- Criar índice para melhorar performance
CREATE INDEX IF NOT EXISTS idx_user_subscription_info_user_id ON user_subscription_info(user_id);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER IF NOT EXISTS update_user_subscription_info_updated_at 
    BEFORE UPDATE ON user_subscription_info 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Função para verificar créditos do usuário
CREATE OR REPLACE FUNCTION check_user_credits(p_user_id UUID, p_credits INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    v_available_credits INTEGER;
BEGIN
    SELECT (plan_credits - credits_used) INTO v_available_credits
    FROM user_subscription_info
    WHERE user_id = p_user_id;
    
    -- Se não encontrou registro, assumir plano free com 3 créditos disponíveis
    IF v_available_credits IS NULL THEN
        RETURN p_credits <= 3;
    END IF;
    
    RETURN v_available_credits >= p_credits;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para consumir créditos do usuário
CREATE OR REPLACE FUNCTION consume_user_credits(p_user_id UUID, p_credits INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    v_current_used INTEGER;
    v_plan_credits INTEGER;
BEGIN
    -- Buscar créditos atuais
    SELECT credits_used, plan_credits INTO v_current_used, v_plan_credits
    FROM user_subscription_info
    WHERE user_id = p_user_id;
    
    -- Se não encontrou registro, criar um novo para plano free
    IF v_current_used IS NULL THEN
        INSERT INTO user_subscription_info (user_id, plan_type, plan_credits, credits_used, max_projects, api_usage_limit)
        VALUES (p_user_id, 'free', 3, p_credits, 3, 50);
        RETURN TRUE;
    END IF;
    
    -- Verificar se tem créditos suficientes
    IF (v_plan_credits - v_current_used) >= p_credits THEN
        UPDATE user_subscription_info
        SET credits_used = credits_used + p_credits,
            updated_at = NOW()
        WHERE user_id = p_user_id;
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar limite de projetos
CREATE OR REPLACE FUNCTION check_project_limit(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_max_projects INTEGER;
    v_current_projects INTEGER;
BEGIN
    -- Buscar limite de projetos
    SELECT max_projects INTO v_max_projects
    FROM user_subscription_info
    WHERE user_id = p_user_id;
    
    -- Se não encontrou registro, assumir plano free com limite de 3
    IF v_max_projects IS NULL THEN
        v_max_projects := 3;
    END IF;
    
    -- Contar projetos atuais
    SELECT COUNT(*) INTO v_current_projects
    FROM projects
    WHERE user_id = p_user_id;
    
    RETURN v_current_projects < v_max_projects;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar acesso a features
CREATE OR REPLACE FUNCTION check_feature_access(p_user_id UUID, p_feature TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_plan_type TEXT;
BEGIN
    SELECT plan_type INTO v_plan_type
    FROM user_subscription_info
    WHERE user_id = p_user_id;
    
    -- Se não encontrou registro, assumir plano free
    IF v_plan_type IS NULL THEN
        v_plan_type := 'free';
    END IF;
    
    -- Verificar acesso baseado no plano
    CASE p_feature
        WHEN 'advanced_templates' THEN
            RETURN v_plan_type IN ('starter', 'enterprise', 'unlimited');
        WHEN 'premium_export' THEN
            RETURN v_plan_type IN ('enterprise', 'unlimited');
        WHEN 'unlimited_projects' THEN
            RETURN v_plan_type = 'unlimited';
        ELSE
            RETURN TRUE; -- Features básicas sempre disponíveis
    END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para resetar créditos mensalmente (pode ser executada via cron)
CREATE OR REPLACE FUNCTION reset_monthly_credits()
RETURNS INTEGER AS $$
DECLARE
    v_updated_count INTEGER;
BEGIN
    UPDATE user_subscription_info
    SET credits_used = 0,
        updated_at = NOW()
    WHERE plan_type IN ('free', 'starter', 'enterprise'); -- unlimited não tem limite de créditos
    
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para log de uso da API
CREATE OR REPLACE FUNCTION log_api_usage(
    p_user_id UUID,
    p_endpoint TEXT,
    p_tokens_used INTEGER DEFAULT 1,
    p_cost DECIMAL DEFAULT 0.001
)
RETURNS VOID AS $$
BEGIN
    -- Para implementar se necessário no futuro
    -- Por enquanto apenas registra que a função foi chamada
    NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;