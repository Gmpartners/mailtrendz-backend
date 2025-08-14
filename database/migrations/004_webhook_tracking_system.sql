-- ============================================
-- 🎯 MIGRATION 004: SISTEMA DE TRACKING DE WEBHOOKS STRIPE
-- ============================================

-- OBJETIVO: Implementar sistema robusto de webhooks com tracking completo
-- FEATURES: Idempotência, auditoria, status de pagamento, retry automático

-- ============================================
-- 1. TABELA DE EVENTOS DE WEBHOOK
-- ============================================

CREATE TABLE IF NOT EXISTS webhook_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    stripe_event_id varchar(255) UNIQUE NOT NULL, -- evt_xxx do Stripe
    event_type varchar(100) NOT NULL, -- invoice.payment_succeeded, etc
    processed boolean DEFAULT false,
    processing_attempts integer DEFAULT 0,
    last_processing_attempt timestamp with time zone,
    processing_error text,
    raw_data jsonb NOT NULL, -- Dados completos do evento
    signature_verified boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT NOW(),
    updated_at timestamp with time zone DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_webhook_events_stripe_id ON webhook_events (stripe_event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_type ON webhook_events (event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON webhook_events (processed);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created ON webhook_events (created_at);

-- ============================================
-- 2. TABELA DE TRANSAÇÕES DE PAGAMENTO
-- ============================================

CREATE TABLE IF NOT EXISTS payment_transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    stripe_invoice_id varchar(255) NOT NULL, -- in_xxx do Stripe
    stripe_payment_intent_id varchar(255), -- pi_xxx do Stripe
    stripe_subscription_id varchar(255), -- sub_xxx do Stripe
    amount_cents integer NOT NULL, -- Valor em centavos
    currency varchar(3) DEFAULT 'brl',
    status varchar(50) NOT NULL, -- succeeded, failed, pending, etc
    payment_method varchar(100), -- card, pix, boleto, etc
    failure_reason text, -- Motivo da falha se houver
    paid_at timestamp with time zone, -- Quando foi pago
    period_start timestamp with time zone, -- Início do período cobrado
    period_end timestamp with time zone, -- Fim do período cobrado
    credits_granted integer DEFAULT 0, -- Créditos concedidos por este pagamento
    metadata jsonb DEFAULT '{}', -- Dados adicionais
    created_at timestamp with time zone DEFAULT NOW(),
    updated_at timestamp with time zone DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user ON payment_transactions (user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions (status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_invoice ON payment_transactions (stripe_invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_subscription ON payment_transactions (stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_paid_at ON payment_transactions (paid_at);

-- ============================================
-- 3. TABELA DE STATUS DE COBRANÇA POR USUÁRIO
-- ============================================

CREATE TABLE IF NOT EXISTS user_billing_status (
    user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    current_status varchar(50) NOT NULL DEFAULT 'active', -- active, past_due, unpaid, canceled
    last_payment_date timestamp with time zone,
    last_payment_amount_cents integer,
    next_payment_due timestamp with time zone,
    payment_failure_count integer DEFAULT 0,
    last_payment_failure_date timestamp with time zone,
    last_payment_failure_reason text,
    days_past_due integer DEFAULT 0,
    notification_sent_at timestamp with time zone,
    grace_period_ends_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT NOW(),
    updated_at timestamp with time zone DEFAULT NOW()
);

-- Índices para queries comuns
CREATE INDEX IF NOT EXISTS idx_user_billing_status_current ON user_billing_status (current_status);
CREATE INDEX IF NOT EXISTS idx_user_billing_status_due ON user_billing_status (next_payment_due);
CREATE INDEX IF NOT EXISTS idx_user_billing_status_past_due ON user_billing_status (days_past_due);

-- ============================================
-- 4. TABELA DE LOGS DE RENOVAÇÃO DE CRÉDITOS
-- ============================================

CREATE TABLE IF NOT EXISTS credit_renewal_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    transaction_id uuid REFERENCES payment_transactions(id),
    credits_before integer NOT NULL,
    credits_granted integer NOT NULL,  
    credits_after integer NOT NULL,
    renewal_type varchar(50) NOT NULL, -- payment_success, manual, migration, etc
    plan_type varchar(50) NOT NULL, -- free, starter, enterprise, unlimited
    period_start timestamp with time zone,
    period_end timestamp with time zone,
    webhook_event_id uuid REFERENCES webhook_events(id),
    metadata jsonb DEFAULT '{}',
    created_at timestamp with time zone DEFAULT NOW()
);

-- Índices para auditoria e relatórios
CREATE INDEX IF NOT EXISTS idx_credit_renewal_logs_user ON credit_renewal_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_credit_renewal_logs_type ON credit_renewal_logs (renewal_type);
CREATE INDEX IF NOT EXISTS idx_credit_renewal_logs_transaction ON credit_renewal_logs (transaction_id);
CREATE INDEX IF NOT EXISTS idx_credit_renewal_logs_created ON credit_renewal_logs (created_at);

-- ============================================
-- 5. TABELA DE NOTIFICAÇÕES DE PAGAMENTO
-- ============================================

CREATE TABLE IF NOT EXISTS payment_notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    notification_type varchar(50) NOT NULL, -- payment_failed, payment_retry, payment_success, etc
    status varchar(20) DEFAULT 'pending', -- pending, sent, failed
    delivery_method varchar(20) DEFAULT 'email', -- email, sms, push
    recipient varchar(255) NOT NULL, -- email ou telefone
    subject varchar(500),
    message text,
    template_used varchar(100),
    sent_at timestamp with time zone,
    delivery_error text,
    metadata jsonb DEFAULT '{}',
    created_at timestamp with time zone DEFAULT NOW()
);

-- Índices para notificações
CREATE INDEX IF NOT EXISTS idx_payment_notifications_user ON payment_notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_payment_notifications_type ON payment_notifications (notification_type);
CREATE INDEX IF NOT EXISTS idx_payment_notifications_status ON payment_notifications (status);

-- ============================================
-- 6. FUNÇÕES AUXILIARES PARA WEBHOOK PROCESSING
-- ============================================

-- Função para registrar evento de webhook
CREATE OR REPLACE FUNCTION register_webhook_event(
    p_stripe_event_id varchar(255),
    p_event_type varchar(100),
    p_raw_data jsonb,
    p_signature_verified boolean DEFAULT true
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    event_uuid uuid;
BEGIN
    -- Inserir ou atualizar evento (idempotência)
    INSERT INTO webhook_events (
        stripe_event_id,
        event_type,
        raw_data,
        signature_verified,
        created_at
    ) VALUES (
        p_stripe_event_id,
        p_event_type,
        p_raw_data,
        p_signature_verified,
        NOW()
    )
    ON CONFLICT (stripe_event_id) 
    DO UPDATE SET
        processing_attempts = webhook_events.processing_attempts + 1,
        last_processing_attempt = NOW(),
        updated_at = NOW()
    RETURNING id INTO event_uuid;
    
    RETURN event_uuid;
END;
$$;

-- Função para processar pagamento bem-sucedido
CREATE OR REPLACE FUNCTION process_successful_payment(
    p_webhook_event_id uuid,
    p_user_id uuid,
    p_stripe_invoice_id varchar(255),
    p_amount_cents integer,
    p_period_start timestamp,
    p_period_end timestamp,
    p_plan_type varchar(50)
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    credits_to_grant integer;
    current_credits integer;
    transaction_uuid uuid;
    renewal_uuid uuid;
BEGIN
    -- Determinar créditos baseado no plano
    credits_to_grant := CASE 
        WHEN p_plan_type = 'starter' THEN 20
        WHEN p_plan_type = 'enterprise' THEN 50
        WHEN p_plan_type = 'unlimited' THEN 999999
        ELSE 0
    END;
    
    -- Buscar créditos atuais
    SELECT credits_available INTO current_credits
    FROM subscription_state 
    WHERE user_id = p_user_id;
    
    -- Registrar transação de pagamento
    INSERT INTO payment_transactions (
        user_id,
        stripe_invoice_id,
        amount_cents,
        status,
        paid_at,
        period_start,
        period_end,
        credits_granted,
        metadata
    ) VALUES (
        p_user_id,
        p_stripe_invoice_id,
        p_amount_cents,
        'succeeded',
        NOW(),
        p_period_start,
        p_period_end,
        credits_to_grant,
        jsonb_build_object(
            'plan_type', p_plan_type,
            'webhook_event_id', p_webhook_event_id
        )
    ) RETURNING id INTO transaction_uuid;
    
    -- Renovar créditos usando função existente
    PERFORM initialize_user_credits(p_user_id, p_plan_type::text);
    
    -- Atualizar status de cobrança
    INSERT INTO user_billing_status (
        user_id,
        current_status,
        last_payment_date,
        last_payment_amount_cents,
        next_payment_due,
        payment_failure_count,
        updated_at
    ) VALUES (
        p_user_id,
        'active',
        NOW(),
        p_amount_cents,
        p_period_end,
        0,
        NOW()
    )
    ON CONFLICT (user_id) 
    DO UPDATE SET
        current_status = 'active',
        last_payment_date = NOW(),
        last_payment_amount_cents = p_amount_cents,
        next_payment_due = p_period_end,
        payment_failure_count = 0,
        last_payment_failure_date = NULL,
        last_payment_failure_reason = NULL,
        days_past_due = 0,
        updated_at = NOW();
    
    -- Log da renovação
    INSERT INTO credit_renewal_logs (
        user_id,
        transaction_id,
        credits_before,
        credits_granted,
        credits_after,
        renewal_type,
        plan_type,
        period_start,
        period_end,
        webhook_event_id
    ) VALUES (
        p_user_id,
        transaction_uuid,
        COALESCE(current_credits, 0),
        credits_to_grant,
        credits_to_grant, -- Após renovação
        'payment_success',
        p_plan_type,
        p_period_start,
        p_period_end,
        p_webhook_event_id
    ) RETURNING id INTO renewal_uuid;
    
    -- Marcar evento como processado
    UPDATE webhook_events 
    SET 
        processed = true,
        processing_attempts = processing_attempts + 1,
        last_processing_attempt = NOW(),
        updated_at = NOW()
    WHERE id = p_webhook_event_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'transaction_id', transaction_uuid,
        'renewal_log_id', renewal_uuid,
        'credits_granted', credits_to_grant,
        'new_status', 'active'
    );
END;
$$;

-- Função para processar falha de pagamento
CREATE OR REPLACE FUNCTION process_payment_failure(
    p_webhook_event_id uuid,
    p_user_id uuid,
    p_stripe_invoice_id varchar(255),
    p_failure_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    failure_count integer;
    new_status varchar(50);
BEGIN
    -- Registrar transação falhada
    INSERT INTO payment_transactions (
        user_id,
        stripe_invoice_id,
        amount_cents,
        status,
        failure_reason,
        metadata
    ) VALUES (
        p_user_id,
        p_stripe_invoice_id,
        0,
        'failed',
        p_failure_reason,
        jsonb_build_object(
            'webhook_event_id', p_webhook_event_id,
            'failed_at', NOW()
        )
    );
    
    -- Atualizar status de cobrança
    SELECT payment_failure_count + 1 INTO failure_count
    FROM user_billing_status
    WHERE user_id = p_user_id;
    
    -- Determinar novo status baseado no número de falhas
    new_status := CASE 
        WHEN failure_count >= 3 THEN 'unpaid'
        WHEN failure_count >= 1 THEN 'past_due'
        ELSE 'active'
    END;
    
    -- Atualizar status do usuário
    INSERT INTO user_billing_status (
        user_id,
        current_status,
        payment_failure_count,
        last_payment_failure_date,
        last_payment_failure_reason,
        days_past_due,
        grace_period_ends_at,
        updated_at
    ) VALUES (
        p_user_id,
        new_status,
        1,
        NOW(),
        p_failure_reason,
        1,
        NOW() + INTERVAL '7 days',
        NOW()
    )
    ON CONFLICT (user_id) 
    DO UPDATE SET
        current_status = new_status,
        payment_failure_count = user_billing_status.payment_failure_count + 1,
        last_payment_failure_date = NOW(),
        last_payment_failure_reason = p_failure_reason,
        days_past_due = CASE 
            WHEN user_billing_status.next_payment_due < NOW() 
            THEN EXTRACT(DAYS FROM NOW() - user_billing_status.next_payment_due)::integer
            ELSE 0
        END,
        grace_period_ends_at = CASE 
            WHEN user_billing_status.grace_period_ends_at IS NULL 
            THEN NOW() + INTERVAL '7 days'
            ELSE user_billing_status.grace_period_ends_at
        END,
        updated_at = NOW();
    
    -- Marcar evento como processado
    UPDATE webhook_events 
    SET 
        processed = true,
        processing_attempts = processing_attempts + 1,
        last_processing_attempt = NOW(),
        updated_at = NOW()
    WHERE id = p_webhook_event_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'new_status', new_status,
        'failure_count', failure_count,
        'grace_period_ends', NOW() + INTERVAL '7 days'
    );
END;
$$;

-- ============================================
-- 7. VIEWS PARA MONITORAMENTO E RELATÓRIOS
-- ============================================

-- View de eventos de webhook recentes
CREATE OR REPLACE VIEW recent_webhook_events AS
SELECT 
    we.id,
    we.stripe_event_id,
    we.event_type,
    we.processed,
    we.processing_attempts,
    we.signature_verified,
    we.created_at,
    CASE 
        WHEN we.processed THEN '✅ Processado'
        WHEN we.processing_attempts > 3 THEN '❌ Falha'
        WHEN we.processing_attempts > 0 THEN '🔄 Tentando'
        ELSE '⏳ Pendente'
    END as status_display
FROM webhook_events we
ORDER BY we.created_at DESC;

-- View de status de cobrança dos usuários
CREATE OR REPLACE VIEW user_payment_overview AS
SELECT 
    u.id as user_id,
    u.email,
    p.subscription as plan_type,
    ubs.current_status,
    ubs.last_payment_date,
    ubs.last_payment_amount_cents / 100.0 as last_payment_amount,
    ubs.next_payment_due,
    ubs.days_past_due,
    ubs.payment_failure_count,
    CASE 
        WHEN ubs.current_status = 'active' THEN '✅ Ativo'
        WHEN ubs.current_status = 'past_due' THEN '⚠️ Atrasado'
        WHEN ubs.current_status = 'unpaid' THEN '❌ Não Pago'
        WHEN ubs.current_status = 'canceled' THEN '🚫 Cancelado'
        ELSE '❓ Desconhecido'
    END as status_display,
    CASE 
        WHEN ubs.next_payment_due < NOW() THEN '🔴 Vencido'
        WHEN ubs.next_payment_due < NOW() + INTERVAL '3 days' THEN '🟡 Vence em breve'
        ELSE '🟢 Em dia'
    END as payment_urgency
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
LEFT JOIN user_billing_status ubs ON u.id = ubs.user_id
WHERE p.subscription != 'free' OR p.subscription IS NULL
ORDER BY ubs.days_past_due DESC, ubs.next_payment_due ASC;

-- View de histórico de transações
CREATE OR REPLACE VIEW payment_history_overview AS
SELECT 
    pt.id,
    u.email,
    pt.stripe_invoice_id,
    pt.amount_cents / 100.0 as amount,
    pt.currency,
    pt.status,
    pt.payment_method,
    pt.credits_granted,
    pt.period_start,
    pt.period_end,
    pt.paid_at,
    pt.failure_reason,
    CASE 
        WHEN pt.status = 'succeeded' THEN '✅ Sucesso'
        WHEN pt.status = 'failed' THEN '❌ Falhou'
        WHEN pt.status = 'pending' THEN '⏳ Pendente'
        ELSE '❓ Desconhecido'
    END as status_display
FROM payment_transactions pt
LEFT JOIN auth.users u ON pt.user_id = u.id
ORDER BY pt.created_at DESC;

-- ============================================
-- 8. POLÍTICAS RLS (ROW LEVEL SECURITY)
-- ============================================

-- Habilitar RLS nas novas tabelas
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_billing_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_renewal_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_notifications ENABLE ROW LEVEL SECURITY;

-- Políticas para webhook_events (apenas service_role)
CREATE POLICY "Service role can manage webhook events" ON webhook_events
    FOR ALL USING (auth.role() = 'service_role');

-- Políticas para payment_transactions (usuários veem apenas os próprios)
CREATE POLICY "Users can view own payment transactions" ON payment_transactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage payment transactions" ON payment_transactions
    FOR ALL USING (auth.role() = 'service_role');

-- Políticas para user_billing_status (usuários veem apenas o próprio)
CREATE POLICY "Users can view own billing status" ON user_billing_status
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage billing status" ON user_billing_status
    FOR ALL USING (auth.role() = 'service_role');

-- Políticas para credit_renewal_logs (usuários veem apenas os próprios)
CREATE POLICY "Users can view own credit logs" ON credit_renewal_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage credit logs" ON credit_renewal_logs
    FOR ALL USING (auth.role() = 'service_role');

-- Políticas para payment_notifications (usuários veem apenas as próprias)
CREATE POLICY "Users can view own notifications" ON payment_notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage notifications" ON payment_notifications
    FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- 9. PERMISSÕES PARA FUNÇÕES
-- ============================================

-- Conceder permissões para service_role
GRANT EXECUTE ON FUNCTION register_webhook_event TO service_role;
GRANT EXECUTE ON FUNCTION process_successful_payment TO service_role;
GRANT EXECUTE ON FUNCTION process_payment_failure TO service_role;

-- Conceder acesso às views para roles apropriados
GRANT SELECT ON recent_webhook_events TO service_role;
GRANT SELECT ON user_payment_overview TO service_role;
GRANT SELECT ON payment_history_overview TO service_role;

-- ============================================
-- 10. DADOS INICIAIS E LOG DE MIGRAÇÃO
-- ============================================

-- Inserir log da migração
INSERT INTO admin_logs (action, details) VALUES (
    'webhook_tracking_system_migration',
    jsonb_build_object(
        'version', '004',
        'migration_date', NOW(),
        'tables_created', jsonb_build_array(
            'webhook_events',
            'payment_transactions', 
            'user_billing_status',
            'credit_renewal_logs',
            'payment_notifications'
        ),
        'functions_created', jsonb_build_array(
            'register_webhook_event',
            'process_successful_payment',
            'process_payment_failure'
        ),
        'views_created', jsonb_build_array(
            'recent_webhook_events',
            'user_payment_overview', 
            'payment_history_overview'
        )
    )
);

-- Inicializar status de cobrança para usuários pagos existentes
INSERT INTO user_billing_status (user_id, current_status)
SELECT 
    u.id,
    CASE 
        WHEN p.subscription = 'free' THEN 'active'
        WHEN s.status = 'active' THEN 'active'
        ELSE 'unknown'
    END
FROM auth.users u
JOIN profiles p ON u.id = p.id
LEFT JOIN subscriptions s ON u.id = s.user_id
WHERE NOT EXISTS (
    SELECT 1 FROM user_billing_status ubs WHERE ubs.user_id = u.id
);

-- ============================================
-- ✅ MIGRAÇÃO 004 COMPLETA
-- ============================================

SELECT 
    'Webhook Tracking System' as sistema,
    '✅ Instalado com sucesso' as status,
    NOW() as data_instalacao;