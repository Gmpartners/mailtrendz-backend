-- ===================================================================
-- MIGRATION 004: SISTEMA COMPLETO DE TRACKING DE WEBHOOKS E PAGAMENTOS
-- ===================================================================

-- 1. TABELA DE EVENTOS DE WEBHOOK
-- ===================================================================
CREATE TABLE IF NOT EXISTS webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stripe_event_id VARCHAR(255) UNIQUE NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    api_version VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'retrying')),
    retry_count INTEGER DEFAULT 0,
    last_retry_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    raw_data JSONB NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_webhook_events_stripe_id ON webhook_events(stripe_event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_type ON webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_events_status ON webhook_events(status);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON webhook_events(created_at DESC);

-- 2. TABELA DE TRANSAÇÕES DE PAGAMENTO
-- ===================================================================
CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    stripe_payment_intent_id VARCHAR(255),
    stripe_invoice_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    stripe_customer_id VARCHAR(255),
    amount_cents INTEGER NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(30) NOT NULL CHECK (status IN (
        'pending', 'processing', 'succeeded', 'failed', 'canceled', 
        'refunded', 'partially_refunded', 'requires_action'
    )),
    payment_method VARCHAR(50),
    plan_type VARCHAR(20),
    billing_period VARCHAR(10) CHECK (billing_period IN ('monthly', 'yearly')),
    failure_reason TEXT,
    failure_code VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_stripe_payment_intent ON payment_transactions(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_stripe_invoice ON payment_transactions(stripe_invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_created_at ON payment_transactions(created_at DESC);

-- 3. TABELA DE STATUS DE COBRANÇA POR USUÁRIO
-- ===================================================================
CREATE TABLE IF NOT EXISTS user_billing_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id),
    current_status VARCHAR(30) DEFAULT 'active' CHECK (current_status IN (
        'active', 'past_due', 'unpaid', 'canceled', 'incomplete', 'trialing'
    )),
    last_payment_date TIMESTAMP WITH TIME ZONE,
    last_payment_amount_cents INTEGER,
    next_payment_date TIMESTAMP WITH TIME ZONE,
    failed_payment_count INTEGER DEFAULT 0,
    last_failed_payment_date TIMESTAMP WITH TIME ZONE,
    last_failed_payment_reason TEXT,
    grace_period_end TIMESTAMP WITH TIME ZONE,
    notifications_sent INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_user_billing_status_user_id ON user_billing_status(user_id);
CREATE INDEX IF NOT EXISTS idx_user_billing_status_status ON user_billing_status(current_status);
CREATE INDEX IF NOT EXISTS idx_user_billing_status_next_payment ON user_billing_status(next_payment_date);

-- 4. TABELA DE LOGS DE RENOVAÇÃO DE CRÉDITOS
-- ===================================================================
CREATE TABLE IF NOT EXISTS credit_renewal_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    plan_type VARCHAR(20) NOT NULL,
    credits_granted INTEGER NOT NULL,
    renewal_trigger VARCHAR(50) NOT NULL CHECK (renewal_trigger IN (
        'payment_succeeded', 'subscription_created', 'subscription_updated', 
        'manual_renewal', 'admin_action', 'trial_started'
    )),
    stripe_event_id VARCHAR(255),
    stripe_invoice_id VARCHAR(255),
    previous_credits INTEGER DEFAULT 0,
    new_total_credits INTEGER NOT NULL,
    period_start TIMESTAMP WITH TIME ZONE,
    period_end TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_credit_renewal_logs_user_id ON credit_renewal_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_renewal_logs_trigger ON credit_renewal_logs(renewal_trigger);
CREATE INDEX IF NOT EXISTS idx_credit_renewal_logs_created_at ON credit_renewal_logs(created_at DESC);

-- 5. TABELA DE NOTIFICAÇÕES DE PAGAMENTO
-- ===================================================================
CREATE TABLE IF NOT EXISTS payment_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    notification_type VARCHAR(50) NOT NULL CHECK (notification_type IN (
        'payment_succeeded', 'payment_failed', 'payment_past_due', 
        'subscription_canceled', 'trial_ending', 'credits_renewed',
        'payment_retry_failed', 'grace_period_ending'
    )),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
    channel VARCHAR(20) DEFAULT 'email' CHECK (channel IN ('email', 'in_app', 'webhook')),
    retry_count INTEGER DEFAULT 0,
    last_retry_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_payment_notifications_user_id ON payment_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_notifications_type ON payment_notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_payment_notifications_status ON payment_notifications(status);
CREATE INDEX IF NOT EXISTS idx_payment_notifications_created_at ON payment_notifications(created_at DESC);

-- 6. FUNÇÕES AUXILIARES
-- ===================================================================

-- Função para marcar evento de webhook como processado
CREATE OR REPLACE FUNCTION mark_webhook_event_completed(
    p_stripe_event_id VARCHAR(255),
    p_metadata JSONB DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE webhook_events 
    SET 
        status = 'completed',
        processed_at = NOW(),
        metadata = COALESCE(p_metadata, metadata)
    WHERE stripe_event_id = p_stripe_event_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Função para marcar evento como falhado e incrementar retry
CREATE OR REPLACE FUNCTION mark_webhook_event_failed(
    p_stripe_event_id VARCHAR(255),
    p_error_message TEXT,
    p_should_retry BOOLEAN DEFAULT TRUE
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE webhook_events 
    SET 
        status = CASE WHEN p_should_retry THEN 'retrying' ELSE 'failed' END,
        retry_count = retry_count + 1,
        last_retry_at = NOW(),
        error_message = p_error_message
    WHERE stripe_event_id = p_stripe_event_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Função para atualizar status de cobrança do usuário
CREATE OR REPLACE FUNCTION update_user_billing_status(
    p_user_id UUID,
    p_status VARCHAR(30),
    p_payment_amount_cents INTEGER DEFAULT NULL,
    p_next_payment_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_failure_reason TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    INSERT INTO user_billing_status (
        user_id, 
        current_status, 
        last_payment_date,
        last_payment_amount_cents,
        next_payment_date,
        failed_payment_count,
        last_failed_payment_date,
        last_failed_payment_reason,
        updated_at
    ) VALUES (
        p_user_id,
        p_status,
        CASE WHEN p_status = 'active' AND p_payment_amount_cents IS NOT NULL THEN NOW() ELSE NULL END,
        p_payment_amount_cents,
        p_next_payment_date,
        CASE WHEN p_status IN ('past_due', 'unpaid') THEN 1 ELSE 0 END,
        CASE WHEN p_status IN ('past_due', 'unpaid') THEN NOW() ELSE NULL END,
        p_failure_reason,
        NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        current_status = p_status,
        last_payment_date = CASE 
            WHEN p_status = 'active' AND p_payment_amount_cents IS NOT NULL 
            THEN NOW() 
            ELSE user_billing_status.last_payment_date 
        END,
        last_payment_amount_cents = COALESCE(p_payment_amount_cents, user_billing_status.last_payment_amount_cents),
        next_payment_date = COALESCE(p_next_payment_date, user_billing_status.next_payment_date),
        failed_payment_count = CASE 
            WHEN p_status IN ('past_due', 'unpaid') 
            THEN user_billing_status.failed_payment_count + 1 
            WHEN p_status = 'active'
            THEN 0
            ELSE user_billing_status.failed_payment_count 
        END,
        last_failed_payment_date = CASE 
            WHEN p_status IN ('past_due', 'unpaid') 
            THEN NOW() 
            ELSE user_billing_status.last_failed_payment_date 
        END,
        last_failed_payment_reason = COALESCE(p_failure_reason, user_billing_status.last_failed_payment_reason),
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Função para registrar renovação de créditos
CREATE OR REPLACE FUNCTION log_credit_renewal(
    p_user_id UUID,
    p_plan_type VARCHAR(20),
    p_credits_granted INTEGER,
    p_renewal_trigger VARCHAR(50),
    p_stripe_event_id VARCHAR(255) DEFAULT NULL,
    p_stripe_invoice_id VARCHAR(255) DEFAULT NULL,
    p_period_start TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_period_end TIMESTAMP WITH TIME ZONE DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
    v_previous_credits INTEGER;
    v_new_total INTEGER;
BEGIN
    -- Obter créditos atuais
    SELECT credits_available INTO v_previous_credits
    FROM monthly_usage 
    WHERE user_id = p_user_id 
    ORDER BY created_at DESC 
    LIMIT 1;
    
    v_previous_credits := COALESCE(v_previous_credits, 0);
    v_new_total := v_previous_credits + p_credits_granted;
    
    -- Inserir log
    INSERT INTO credit_renewal_logs (
        user_id, plan_type, credits_granted, renewal_trigger,
        stripe_event_id, stripe_invoice_id, previous_credits,
        new_total_credits, period_start, period_end
    ) VALUES (
        p_user_id, p_plan_type, p_credits_granted, p_renewal_trigger,
        p_stripe_event_id, p_stripe_invoice_id, v_previous_credits,
        v_new_total, p_period_start, p_period_end
    ) RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

-- 7. TRIGGERS PARA AUDITORIA
-- ===================================================================

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger nas tabelas relevantes
CREATE TRIGGER update_payment_transactions_updated_at
    BEFORE UPDATE ON payment_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_billing_status_updated_at
    BEFORE UPDATE ON user_billing_status
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 8. VIEWS PARA RELATÓRIOS
-- ===================================================================

-- View para status consolidado de pagamentos por usuário
CREATE OR REPLACE VIEW user_payment_status AS
SELECT 
    u.id as user_id,
    u.email,
    p.name,
    ubs.current_status,
    ubs.last_payment_date,
    ubs.last_payment_amount_cents,
    ubs.next_payment_date,
    ubs.failed_payment_count,
    ubs.last_failed_payment_reason,
    s.plan_type,
    s.status as subscription_status,
    s.current_period_end,
    CASE 
        WHEN ubs.current_status = 'past_due' AND ubs.next_payment_date < NOW() 
        THEN TRUE 
        ELSE FALSE 
    END as is_overdue,
    CASE 
        WHEN ubs.failed_payment_count >= 3 
        THEN TRUE 
        ELSE FALSE 
    END as requires_attention
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
LEFT JOIN user_billing_status ubs ON u.id = ubs.user_id
LEFT JOIN subscriptions s ON u.id = s.user_id;

-- View para eventos de webhook recentes
CREATE OR REPLACE VIEW recent_webhook_events AS
SELECT 
    we.id,
    we.stripe_event_id,
    we.event_type,
    we.status,
    we.retry_count,
    we.created_at,
    we.processed_at,
    we.error_message,
    EXTRACT(EPOCH FROM (NOW() - we.created_at)) as age_seconds
FROM webhook_events we
WHERE we.created_at > NOW() - INTERVAL '7 days'
ORDER BY we.created_at DESC;

-- 9. POLICIES DE SEGURANÇA (RLS)
-- ===================================================================

-- Habilitar RLS nas tabelas
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_billing_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_renewal_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_notifications ENABLE ROW LEVEL SECURITY;

-- Policies para webhook_events (apenas service role)
CREATE POLICY "Service role can manage webhook events" ON webhook_events
    FOR ALL USING (auth.role() = 'service_role');

-- Policies para payment_transactions (usuário pode ver apenas os seus)
CREATE POLICY "Users can view own payment transactions" ON payment_transactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage payment transactions" ON payment_transactions
    FOR ALL USING (auth.role() = 'service_role');

-- Policies para user_billing_status (usuário pode ver apenas o seu)
CREATE POLICY "Users can view own billing status" ON user_billing_status
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage billing status" ON user_billing_status
    FOR ALL USING (auth.role() = 'service_role');

-- Policies para credit_renewal_logs (usuário pode ver apenas os seus)
CREATE POLICY "Users can view own credit renewal logs" ON credit_renewal_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage credit renewal logs" ON credit_renewal_logs
    FOR ALL USING (auth.role() = 'service_role');

-- Policies para payment_notifications (usuário pode ver apenas as suas)
CREATE POLICY "Users can view own payment notifications" ON payment_notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage payment notifications" ON payment_notifications
    FOR ALL USING (auth.role() = 'service_role');

-- 10. COMENTÁRIOS PARA DOCUMENTAÇÃO
-- ===================================================================

COMMENT ON TABLE webhook_events IS 'Registra todos os eventos de webhook recebidos do Stripe para auditoria e reprocessamento';
COMMENT ON TABLE payment_transactions IS 'Rastreia todas as transações de pagamento com detalhes completos';
COMMENT ON TABLE user_billing_status IS 'Mantém o status atual de cobrança de cada usuário';
COMMENT ON TABLE credit_renewal_logs IS 'Log detalhado de todas as renovações de créditos';
COMMENT ON TABLE payment_notifications IS 'Fila de notificações relacionadas a pagamentos';

COMMENT ON FUNCTION mark_webhook_event_completed IS 'Marca um evento de webhook como processado com sucesso';
COMMENT ON FUNCTION mark_webhook_event_failed IS 'Marca um evento de webhook como falhado e configura retry se necessário';
COMMENT ON FUNCTION update_user_billing_status IS 'Atualiza o status de cobrança de um usuário';
COMMENT ON FUNCTION log_credit_renewal IS 'Registra uma renovação de créditos no log de auditoria';

-- ===================================================================
-- FIM DA MIGRATION 004
-- ===================================================================