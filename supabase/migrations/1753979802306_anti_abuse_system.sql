
-- Migration: Anti-Abuse System
-- Created: 2025-07-31T16:36:42.306Z

-- 1. Tabela de tracking de IPs
CREATE TABLE IF NOT EXISTS user_ip_tracking (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    ip_address INET NOT NULL,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    signup_ip BOOLEAN DEFAULT FALSE,
    login_count INTEGER DEFAULT 1,
    UNIQUE(user_id, ip_address)
);

-- 2. Tabela de blacklist
CREATE TABLE IF NOT EXISTS ip_blacklist (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ip_address INET NOT NULL UNIQUE,
    reason TEXT NOT NULL,
    blocked_by UUID REFERENCES auth.users(id),
    blocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_permanent BOOLEAN DEFAULT FALSE,
    auto_blocked BOOLEAN DEFAULT FALSE,
    violation_count INTEGER DEFAULT 1
);

-- 3. Tabela de logs
CREATE TABLE IF NOT EXISTS admin_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    action_type TEXT NOT NULL,
    ip_address INET,
    user_id UUID REFERENCES auth.users(id),
    admin_user_id UUID REFERENCES auth.users(id),
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_user_ip_tracking_user_id ON user_ip_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_user_ip_tracking_ip_address ON user_ip_tracking(ip_address);
CREATE INDEX IF NOT EXISTS idx_ip_blacklist_ip_address ON ip_blacklist(ip_address);
CREATE INDEX IF NOT EXISTS idx_admin_logs_action_type ON admin_logs(action_type);

-- Habilitar RLS
ALTER TABLE user_ip_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE ip_blacklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;

-- Permissões básicas
GRANT ALL ON user_ip_tracking TO service_role;
GRANT ALL ON ip_blacklist TO service_role;
GRANT ALL ON admin_logs TO service_role;

-- Inserir log inicial
INSERT INTO admin_logs (action_type, details) VALUES
('SYSTEM', jsonb_build_object(
    'message', 'Anti-abuse system initialized',
    'version', '1.0.0',
    'timestamp', NOW()
));
