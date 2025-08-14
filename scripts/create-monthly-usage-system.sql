-- =============================================
-- MAILTRENDZ - SISTEMA DE REQUISIÇÕES MENSAIS
-- =============================================

-- 1. CRIAR TABELA DE USO MENSAL
-- =============================================
CREATE TABLE IF NOT EXISTS public.user_monthly_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  period_start TIMESTAMP NOT NULL,
  period_end TIMESTAMP NOT NULL,
  requests_used INTEGER DEFAULT 0 NOT NULL CHECK (requests_used >= 0),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, period_start)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_user_monthly_usage_user_period 
  ON public.user_monthly_usage(user_id, period_start DESC);

CREATE INDEX IF NOT EXISTS idx_user_monthly_usage_period 
  ON public.user_monthly_usage(period_start, period_end);

-- 2. ADICIONAR CAMPOS AO PROFILES (SE NÃO EXISTIREM)
-- =============================================
DO $$
BEGIN
  -- Adicionar subscription_started_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'subscription_started_at'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.profiles 
    ADD COLUMN subscription_started_at TIMESTAMP DEFAULT NOW();
    RAISE NOTICE '✅ Coluna subscription_started_at adicionada';
  END IF;

  -- Adicionar billing_cycle_day
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'billing_cycle_day'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.profiles 
    ADD COLUMN billing_cycle_day INTEGER DEFAULT 1 CHECK (billing_cycle_day >= 1 AND billing_cycle_day <= 31);
    RAISE NOTICE '✅ Coluna billing_cycle_day adicionada';
  END IF;
END $$;

-- 3. FUNÇÃO PARA INCREMENTAR USO MENSAL
-- =============================================
CREATE OR REPLACE FUNCTION increment_monthly_usage(
  p_user_id UUID,
  p_amount INTEGER,
  p_period_start TIMESTAMP,
  p_period_end TIMESTAMP
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.user_monthly_usage (
    user_id, 
    period_start, 
    period_end, 
    requests_used
  ) VALUES (
    p_user_id,
    p_period_start,
    p_period_end,
    p_amount
  ) 
  ON CONFLICT (user_id, period_start) 
  DO UPDATE SET 
    requests_used = user_monthly_usage.requests_used + p_amount,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- 4. VIEW PARA FACILITAR CONSULTAS
-- =============================================
CREATE OR REPLACE VIEW public.user_current_usage AS
SELECT 
  p.id as user_id,
  p.email,
  p.subscription as plan_type,
  COALESCE(umu.requests_used, 0) as requests_used,
  CASE 
    WHEN p.subscription = 'free' THEN 3
    WHEN p.subscription = 'starter' THEN 20
    WHEN p.subscription = 'enterprise' THEN 50
    WHEN p.subscription = 'unlimited' THEN 999999
    ELSE 3
  END as requests_limit,
  CASE 
    WHEN p.subscription = 'unlimited' THEN 999999
    ELSE GREATEST(0, 
      CASE 
        WHEN p.subscription = 'free' THEN 3
        WHEN p.subscription = 'starter' THEN 20
        WHEN p.subscription = 'enterprise' THEN 50
        ELSE 3
      END - COALESCE(umu.requests_used, 0)
    )
  END as requests_available,
  umu.period_start,
  umu.period_end,
  CASE 
    WHEN umu.period_end IS NULL THEN NULL
    ELSE EXTRACT(DAYS FROM (umu.period_end - NOW()))::INTEGER
  END as days_until_reset
FROM 
  public.profiles p
LEFT JOIN public.user_monthly_usage umu ON 
  p.id = umu.user_id 
  AND umu.period_start <= NOW() 
  AND umu.period_end >= NOW();

-- 5. RLS POLICIES
-- =============================================
ALTER TABLE public.user_monthly_usage ENABLE ROW LEVEL SECURITY;

-- Política para SELECT
CREATE POLICY "Users can view their own usage" 
  ON public.user_monthly_usage
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Política para INSERT (apenas sistema)
CREATE POLICY "System can insert usage records" 
  ON public.user_monthly_usage
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Política para UPDATE (apenas sistema)
CREATE POLICY "System can update usage records" 
  ON public.user_monthly_usage
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- 6. TRIGGER PARA ATUALIZAR updated_at
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_monthly_usage_updated_at 
  BEFORE UPDATE ON public.user_monthly_usage
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- 7. FUNÇÃO PARA CRIAR PERÍODOS INICIAIS
-- =============================================
CREATE OR REPLACE FUNCTION initialize_monthly_usage_for_all_users()
RETURNS void AS $$
DECLARE
  user_record RECORD;
  current_period_start DATE;
  current_period_end DATE;
BEGIN
  FOR user_record IN SELECT id, COALESCE(billing_cycle_day, 1) as billing_day FROM profiles LOOP
    -- Calcular período atual baseado em billing_cycle_day
    current_period_start := date_trunc('month', CURRENT_DATE) + 
      (user_record.billing_day - 1) * INTERVAL '1 day';
    
    IF current_period_start > CURRENT_DATE THEN
      current_period_start := current_period_start - INTERVAL '1 month';
    END IF;
    
    current_period_end := current_period_start + INTERVAL '1 month' - INTERVAL '1 second';
    
    -- Criar registro se não existir
    INSERT INTO user_monthly_usage (
      user_id, 
      period_start, 
      period_end, 
      requests_used
    ) VALUES (
      user_record.id,
      current_period_start,
      current_period_end,
      0
    ) ON CONFLICT (user_id, period_start) DO NOTHING;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 8. POPULAR billing_cycle_day BASEADO EM created_at
-- =============================================
UPDATE public.profiles 
SET billing_cycle_day = EXTRACT(DAY FROM created_at)::INTEGER
WHERE billing_cycle_day IS NULL;

-- 9. EXECUTAR INICIALIZAÇÃO
-- =============================================
SELECT initialize_monthly_usage_for_all_users();

-- 10. MENSAGEM FINAL
-- =============================================
DO $$
BEGIN
  RAISE NOTICE '🎯 SISTEMA DE REQUISIÇÕES MENSAIS IMPLEMENTADO!';
  RAISE NOTICE '✅ Tabela user_monthly_usage criada';
  RAISE NOTICE '✅ Campos billing_cycle_day e subscription_started_at adicionados';
  RAISE NOTICE '✅ Funções e triggers configurados';
  RAISE NOTICE '✅ View user_current_usage disponível';
  RAISE NOTICE '✅ Políticas RLS aplicadas';
  RAISE NOTICE '✅ Períodos iniciais criados para todos os usuários';
  RAISE NOTICE '🚀 Sistema pronto para uso!';
END $$;
