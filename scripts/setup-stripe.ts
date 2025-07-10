import dotenv from 'dotenv'

// ✅ CARREGAR VARIÁVEIS DE AMBIENTE PRIMEIRO
dotenv.config()

import { supabase } from '../src/config/supabase.config'
import { logger } from '../src/utils/logger'

async function setupStripeIntegration() {
  try {
    console.log('🚀 Iniciando setup da integração Stripe...\n')

    // Verificar se as variáveis estão carregadas
    console.log('🔍 Verificando variáveis de ambiente...')
    if (!process.env.SUPABASE_URL) {
      throw new Error('SUPABASE_URL não encontrada no .env')
    }
    if (!process.env.SUPABASE_ANON_KEY) {
      throw new Error('SUPABASE_ANON_KEY não encontrada no .env')
    }
    if (!process.env.STRIPE_SECRET_KEY) {
      console.log('⚠️  STRIPE_SECRET_KEY não encontrada - configure depois')
    }
    console.log('✅ Variáveis de ambiente OK')

    // 1. Testar conexão com Supabase
    console.log('\n1. Testando conexão com Supabase...')
    
    try {
      const { error: connectionError } = await supabase
        .from('profiles')
        .select('id')
        .limit(1)

      if (connectionError) {
        console.log('⚠️  Erro de conexão:', connectionError.message)
      } else {
        console.log('✅ Conexão com Supabase OK')
      }
    } catch (error: any) {
      console.log('⚠️  Erro ao conectar:', error.message)
    }

    // 2. Criar tabelas
    console.log('\n2. Verificando tabelas existentes...')
    
    // Testar subscriptions
    try {
      const { error: subsError } = await supabase.from('subscriptions').select('id').limit(1)
      if (subsError) {
        console.log('⚠️  Tabela subscriptions não existe')
      } else {
        console.log('✅ Tabela subscriptions OK')
      }
    } catch (error) {
      console.log('⚠️  Tabela subscriptions precisa ser criada')
    }

    // Testar plan_features
    try {
      const { error: plansError } = await supabase.from('plan_features').select('id').limit(1)
      if (plansError) {
        console.log('⚠️  Tabela plan_features não existe')
      } else {
        console.log('✅ Tabela plan_features OK')
      }
    } catch (error) {
      console.log('⚠️  Tabela plan_features precisa ser criada')
    }

    // Testar ai_credits
    try {
      const { error: creditsError } = await supabase.from('ai_credits').select('id').limit(1)
      if (creditsError) {
        console.log('⚠️  Tabela ai_credits não existe')
      } else {
        console.log('✅ Tabela ai_credits OK')
      }
    } catch (error) {
      console.log('⚠️  Tabela ai_credits precisa ser criada')
    }

    // 3. Tentar inserir planos (se a tabela existir)
    console.log('\n3. Tentando inserir planos...')
    
    const plans = [
      { plan_type: 'free', ai_credits: 3, max_projects: 10, has_folders: false, has_multi_user: false, has_html_export: false, has_email_preview: false },
      { plan_type: 'starter', ai_credits: 20, max_projects: 50, has_folders: false, has_multi_user: false, has_html_export: true, has_email_preview: true },
      { plan_type: 'enterprise', ai_credits: 50, max_projects: 200, has_folders: true, has_multi_user: true, has_html_export: true, has_email_preview: true },
      { plan_type: 'unlimited', ai_credits: -1, max_projects: -1, has_folders: true, has_multi_user: true, has_html_export: true, has_email_preview: true }
    ]

    try {
      const { error: plansError } = await supabase
        .from('plan_features')
        .upsert(plans, { onConflict: 'plan_type' })

      if (plansError) {
        console.log('⚠️  Erro ao inserir planos:', plansError.message)
      } else {
        console.log('✅ Planos inseridos/atualizados com sucesso')
      }
    } catch (error: any) {
      console.log('⚠️  Não foi possível inserir planos:', error.message)
    }

    console.log('\n🎯 Diagnóstico concluído!')
    console.log('\n📋 SQL para criar tabelas (se necessário):')
    console.log(`
-- Execute este SQL no Supabase SQL Editor se alguma tabela estiver faltando:

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT UNIQUE,
  stripe_price_id TEXT,
  plan_type TEXT DEFAULT 'free',
  status TEXT DEFAULT 'active',
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS plan_features (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  plan_type TEXT UNIQUE NOT NULL,
  ai_credits INTEGER NOT NULL,
  max_projects INTEGER NOT NULL,
  has_folders BOOLEAN DEFAULT false,
  has_multi_user BOOLEAN DEFAULT false,
  has_html_export BOOLEAN DEFAULT false,
  has_email_preview BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_credits (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  available INTEGER DEFAULT 3,
  used INTEGER DEFAULT 0,
  total INTEGER DEFAULT 3,
  reset_at TIMESTAMP WITH TIME ZONE DEFAULT (DATE_TRUNC('month', NOW()) + INTERVAL '1 month'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir planos
INSERT INTO plan_features (plan_type, ai_credits, max_projects, has_folders, has_multi_user, has_html_export, has_email_preview) VALUES
('free', 3, 10, false, false, false, false),
('starter', 20, 50, false, false, true, true),
('enterprise', 50, 200, true, true, true, true),
('unlimited', -1, -1, true, true, true, true)
ON CONFLICT (plan_type) DO UPDATE SET
ai_credits = EXCLUDED.ai_credits,
max_projects = EXCLUDED.max_projects,
has_folders = EXCLUDED.has_folders,
has_multi_user = EXCLUDED.has_multi_user,
has_html_export = EXCLUDED.has_html_export,
has_email_preview = EXCLUDED.has_email_preview;

-- Função para inicializar créditos
CREATE OR REPLACE FUNCTION initialize_user_credits(
  p_user_id UUID,
  p_plan_type TEXT DEFAULT 'free'
)
RETURNS VOID AS $$ 
DECLARE
  v_credits INTEGER;
BEGIN
  CASE p_plan_type
    WHEN 'starter' THEN v_credits := 20;
    WHEN 'enterprise' THEN v_credits := 50;
    WHEN 'unlimited' THEN v_credits := -1;
    ELSE v_credits := 3;
  END CASE;

  INSERT INTO ai_credits (user_id, available, used, total, reset_at)
  VALUES (
    p_user_id,
    v_credits,
    0,
    v_credits,
    DATE_TRUNC('month', NOW()) + INTERVAL '1 month'
  )
  ON CONFLICT (user_id) DO UPDATE SET
    available = CASE WHEN v_credits = -1 THEN -1 ELSE v_credits END,
    total = CASE WHEN v_credits = -1 THEN -1 ELSE v_credits END,
    reset_at = DATE_TRUNC('month', NOW()) + INTERVAL '1 month',
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- View para informações completas
CREATE OR REPLACE VIEW user_subscription_info AS
SELECT 
  p.id as user_id,
  p.email,
  p.name,
  p.subscription as plan_type,
  s.status as subscription_status,
  s.current_period_end,
  s.cancel_at_period_end,
  c.available as credits_available,
  c.used as credits_used,
  c.total as plan_credits,
  c.reset_at as credits_reset_at,
  pf.max_projects,
  pf.has_folders,
  pf.has_multi_user,
  pf.has_html_export,
  pf.has_email_preview
FROM profiles p
LEFT JOIN subscriptions s ON s.user_id = p.id
LEFT JOIN ai_credits c ON c.user_id = p.id
LEFT JOIN plan_features pf ON pf.plan_type = p.subscription;
`)

    console.log('\n🔗 Teste os endpoints depois de criar as tabelas:')
    console.log('   curl http://localhost:8000/api/v1/subscriptions/plans')

  } catch (error: any) {
    console.error('❌ Erro no setup:', error.message)
    logger.error('Stripe integration setup failed:', error)
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  setupStripeIntegration()
    .then(() => {
      console.log('\n✅ Diagnóstico concluído!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n❌ Erro:', error.message)
      process.exit(1)
    })
}

export { setupStripeIntegration }