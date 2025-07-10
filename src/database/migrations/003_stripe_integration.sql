-- ============================================
-- MAILTRENDZ - STRIPE SUBSCRIPTION TABLES
-- Execute this file in Supabase SQL Editor AFTER the main setup
-- ============================================

-- Update subscription type to match Stripe plans
DROP TYPE IF EXISTS subscription_type CASCADE;
CREATE TYPE subscription_type AS ENUM ('free', 'starter', 'enterprise', 'unlimited');

-- Update profiles table to use new subscription types
ALTER TABLE profiles 
ALTER COLUMN subscription TYPE subscription_type USING subscription::text::subscription_type;

-- Create subscriptions table for Stripe integration
CREATE TABLE subscriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_price_id TEXT,
  plan_type subscription_type DEFAULT 'free' NOT NULL,
  status TEXT DEFAULT 'active',
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create plan_features table
CREATE TABLE plan_features (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  plan_type subscription_type NOT NULL UNIQUE,
  ai_credits INTEGER,
  has_folders BOOLEAN DEFAULT false,
  has_multi_user BOOLEAN DEFAULT false,
  has_html_export BOOLEAN DEFAULT false,
  has_email_preview BOOLEAN DEFAULT false,
  max_projects INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_credits table for tracking usage
CREATE TABLE user_credits (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  available INTEGER DEFAULT 0,
  used INTEGER DEFAULT 0,
  total INTEGER DEFAULT 0,
  reset_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create folders table (for premium features)
CREATE TABLE folders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6b7280',
  parent_id UUID REFERENCES folders(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add folder_id to projects table
ALTER TABLE projects ADD COLUMN folder_id UUID REFERENCES folders(id) ON DELETE SET NULL;

-- Create indexes
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);
CREATE INDEX idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
CREATE INDEX idx_user_credits_user_id ON user_credits(user_id);
CREATE INDEX idx_folders_user_id ON folders(user_id);
CREATE INDEX idx_folders_parent_id ON folders(parent_id);
CREATE INDEX idx_projects_folder_id ON projects(folder_id);

-- Create updated_at triggers
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_plan_features_updated_at BEFORE UPDATE ON plan_features
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_credits_updated_at BEFORE UPDATE ON user_credits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_folders_updated_at BEFORE UPDATE ON folders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert plan features
INSERT INTO plan_features (plan_type, ai_credits, has_folders, has_multi_user, has_html_export, has_email_preview, max_projects) VALUES
  ('free', 50, false, false, false, false, 10),
  ('starter', 500, true, false, true, true, 100),
  ('enterprise', 2000, true, true, true, true, 500),
  ('unlimited', NULL, true, true, true, true, NULL);

-- Create function to initialize user credits
CREATE OR REPLACE FUNCTION initialize_user_credits(
  p_user_id UUID,
  p_plan_type subscription_type
)
RETURNS VOID AS $$
DECLARE
  v_credits INTEGER;
BEGIN
  -- Get credits for plan type
  SELECT ai_credits INTO v_credits
  FROM plan_features 
  WHERE plan_type = p_plan_type;

  -- Set unlimited credits to 999999
  IF v_credits IS NULL THEN
    v_credits := 999999;
  END IF;

  -- Update or insert user credits
  INSERT INTO user_credits (user_id, available, total, reset_at)
  VALUES (
    p_user_id, 
    v_credits, 
    v_credits,
    DATE_TRUNC('month', NOW()) + INTERVAL '1 month'
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET
    available = v_credits,
    total = v_credits,
    used = 0,
    reset_at = DATE_TRUNC('month', NOW()) + INTERVAL '1 month',
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to handle subscription creation
CREATE OR REPLACE FUNCTION handle_new_subscription()
RETURNS TRIGGER AS $$
BEGIN
  -- Initialize user credits based on plan
  PERFORM initialize_user_credits(NEW.user_id, NEW.plan_type);
  
  -- Update profile subscription
  UPDATE profiles 
  SET subscription = NEW.plan_type
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new subscriptions
CREATE TRIGGER on_subscription_created
  AFTER INSERT ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION handle_new_subscription();

-- Create function to reset monthly credits
CREATE OR REPLACE FUNCTION reset_monthly_credits()
RETURNS VOID AS $$
BEGIN
  UPDATE user_credits 
  SET 
    available = pf.ai_credits,
    used = 0,
    reset_at = DATE_TRUNC('month', NOW()) + INTERVAL '1 month'
  FROM profiles p
  JOIN plan_features pf ON p.subscription = pf.plan_type
  WHERE user_credits.user_id = p.id
  AND user_credits.reset_at <= NOW();
  
  -- Handle unlimited plans
  UPDATE user_credits 
  SET 
    available = 999999,
    used = 0,
    reset_at = DATE_TRUNC('month', NOW()) + INTERVAL '1 month'
  FROM profiles p
  WHERE user_credits.user_id = p.id
  AND p.subscription = 'unlimited'
  AND user_credits.reset_at <= NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create view for user subscription info
CREATE VIEW user_subscription_info AS
SELECT 
  p.id as user_id,
  p.name,
  s.stripe_customer_id,
  s.stripe_subscription_id,
  s.plan_type,
  s.status as subscription_status,
  s.current_period_end,
  s.cancel_at_period_end,
  uc.available as credits_available,
  uc.used as credits_used,
  uc.total as plan_credits,
  uc.reset_at as credits_reset_at,
  pf.has_folders,
  pf.has_multi_user,
  pf.has_html_export,
  pf.has_email_preview,
  pf.max_projects
FROM profiles p
LEFT JOIN subscriptions s ON p.id = s.user_id
LEFT JOIN user_credits uc ON p.id = uc.user_id
LEFT JOIN plan_features pf ON COALESCE(s.plan_type, p.subscription) = pf.plan_type;

-- Enable RLS on new tables
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;

-- Subscriptions policies
CREATE POLICY "Users can view own subscription" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own subscription" ON subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

-- Plan features policies (public read)
CREATE POLICY "Everyone can view plan features" ON plan_features
  FOR SELECT USING (true);

-- User credits policies
CREATE POLICY "Users can view own credits" ON user_credits
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own credits" ON user_credits
  FOR UPDATE USING (auth.uid() = user_id);

-- Folders policies
CREATE POLICY "Users can view own folders" ON folders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own folders" ON folders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own folders" ON folders
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own folders" ON folders
  FOR DELETE USING (auth.uid() = user_id);

-- Create initial subscription for existing users
INSERT INTO subscriptions (user_id, plan_type)
SELECT id, subscription 
FROM profiles 
WHERE id NOT IN (SELECT user_id FROM subscriptions)
ON CONFLICT (user_id) DO NOTHING;

-- Initialize credits for existing users
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN SELECT id, subscription FROM profiles LOOP
    PERFORM initialize_user_credits(user_record.id, user_record.subscription);
  END LOOP;
END $$;

-- Final message
DO $$
BEGIN
  RAISE NOTICE '✅ Stripe subscription tables created successfully!';
  RAISE NOTICE '📝 Tables created:';
  RAISE NOTICE '   - subscriptions';
  RAISE NOTICE '   - plan_features';
  RAISE NOTICE '   - user_credits';
  RAISE NOTICE '   - folders';
  RAISE NOTICE '📊 Views created:';
  RAISE NOTICE '   - user_subscription_info';
  RAISE NOTICE '🔧 Functions created:';
  RAISE NOTICE '   - initialize_user_credits()';
  RAISE NOTICE '   - reset_monthly_credits()';
END $$;