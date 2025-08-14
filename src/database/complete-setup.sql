-- ============================================
-- MAILTRENDZ - COMPLETE SUPABASE SETUP
-- Execute this file in Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE subscription_type AS ENUM ('free', 'pro', 'enterprise');
CREATE TYPE project_type AS ENUM ('campaign', 'newsletter', 'transactional', 'notification', 'other');
CREATE TYPE project_status AS ENUM ('draft', 'active', 'archived');

-- Create profiles table (extends auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  avatar TEXT,
  subscription subscription_type DEFAULT 'free',
  api_usage_limit INTEGER DEFAULT 50,
  preferences JSONB DEFAULT '{
    "defaultIndustry": null,
    "defaultTone": "profissional",
    "emailSignature": null
  }'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create projects table
CREATE TABLE projects (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  type project_type DEFAULT 'campaign',
  status project_status DEFAULT 'draft',
  content JSONB NOT NULL DEFAULT '{
    "html": "",
    "text": "",
    "subject": "",
    "previewText": ""
  }'::jsonb,
  structure JSONB DEFAULT NULL,
  metadata JSONB NOT NULL DEFAULT '{
    "industry": "",
    "targetAudience": "",
    "tone": "profissional",
    "originalPrompt": "",
    "version": 1
  }'::jsonb,
  tags TEXT[] DEFAULT '{}',
  color TEXT DEFAULT '#6b7280',
  is_public BOOLEAN DEFAULT false,
  chat_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create project_stats table
CREATE TABLE project_stats (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL UNIQUE,
  opens INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  uses INTEGER DEFAULT 1,
  views INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create chats table
CREATE TABLE chats (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  context JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create chat_messages table
CREATE TABLE chat_messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create api_usage_logs table
CREATE TABLE api_usage_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  endpoint TEXT NOT NULL,
  tokens_used INTEGER DEFAULT 0,
  cost DECIMAL(10, 6) DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create templates table
CREATE TABLE templates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  industry TEXT NOT NULL,
  type project_type NOT NULL,
  structure JSONB NOT NULL,
  thumbnail TEXT,
  is_premium BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create industries table
CREATE TABLE industries (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  templates_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_created_at ON projects(created_at DESC);
CREATE INDEX idx_projects_type ON projects(type);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_tags ON projects USING GIN(tags);
CREATE INDEX idx_projects_is_public ON projects(is_public) WHERE is_public = true;

CREATE INDEX idx_chats_user_id ON chats(user_id);
CREATE INDEX idx_chat_messages_chat_id ON chat_messages(chat_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at);

CREATE INDEX idx_api_usage_logs_user_id ON api_usage_logs(user_id);
CREATE INDEX idx_api_usage_logs_created_at ON api_usage_logs(created_at DESC);

CREATE INDEX idx_templates_industry ON templates(industry);
CREATE INDEX idx_templates_type ON templates(type);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_stats_updated_at BEFORE UPDATE ON project_stats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chats_updated_at BEFORE UPDATE ON chats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to handle user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, name, avatar)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Create function to auto-create project stats
CREATE OR REPLACE FUNCTION handle_new_project()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO project_stats (project_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_project_created
  AFTER INSERT ON projects
  FOR EACH ROW EXECUTE FUNCTION handle_new_project();

-- Create view for user API usage summary
CREATE VIEW user_api_usage_summary AS
SELECT 
  user_id,
  DATE_TRUNC('month', created_at) as month,
  COUNT(*) as request_count,
  SUM(tokens_used) as total_tokens,
  SUM(cost) as total_cost
FROM api_usage_logs
GROUP BY user_id, DATE_TRUNC('month', created_at);

-- Create view for project with stats
CREATE VIEW projects_with_stats AS
SELECT 
  p.*,
  ps.opens,
  ps.clicks,
  ps.uses,
  ps.views,
  CASE 
    WHEN ps.opens > 0 THEN ROUND((ps.clicks::numeric / ps.opens) * 100, 2)
    ELSE 0
  END as conversion_rate
FROM projects p
LEFT JOIN project_stats ps ON p.id = ps.project_id;

-- Enable Row Level Security on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE industries ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Projects policies
CREATE POLICY "Users can view own projects" ON projects
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view public projects" ON projects
  FOR SELECT USING (is_public = true);

CREATE POLICY "Users can insert own projects" ON projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects" ON projects
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects" ON projects
  FOR DELETE USING (auth.uid() = user_id);

-- Project stats policies
CREATE POLICY "Users can view stats of own projects" ON project_stats
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = project_stats.project_id 
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update stats of own projects" ON project_stats
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = project_stats.project_id 
      AND projects.user_id = auth.uid()
    )
  );

-- Chats policies
CREATE POLICY "Users can view own chats" ON chats
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chats" ON chats
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own chats" ON chats
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own chats" ON chats
  FOR DELETE USING (auth.uid() = user_id);

-- Chat messages policies
CREATE POLICY "Users can view messages of own chats" ON chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chats 
      WHERE chats.id = chat_messages.chat_id 
      AND chats.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert messages in own chats" ON chat_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM chats 
      WHERE chats.id = chat_messages.chat_id 
      AND chats.user_id = auth.uid()
    )
  );

-- API usage logs policies
CREATE POLICY "Users can view own API usage" ON api_usage_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert API usage logs" ON api_usage_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Templates policies (public read, admin write)
CREATE POLICY "Everyone can view templates" ON templates
  FOR SELECT USING (true);

CREATE POLICY "Only admins can modify templates" ON templates
  FOR ALL USING (
    auth.jwt() ->> 'role' = 'service_role'
  );

-- Industries policies (public read)
CREATE POLICY "Everyone can view industries" ON industries
  FOR SELECT USING (true);

CREATE POLICY "Only admins can modify industries" ON industries
  FOR ALL USING (
    auth.jwt() ->> 'role' = 'service_role'
  );

-- Create function to check API limits
CREATE OR REPLACE FUNCTION check_api_limit(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_limit INTEGER;
  v_usage INTEGER;
  v_subscription subscription_type;
BEGIN
  SELECT subscription, api_usage_limit 
  INTO v_subscription, v_limit
  FROM profiles 
  WHERE id = p_user_id;

  SELECT COUNT(*) 
  INTO v_usage
  FROM api_usage_logs
  WHERE user_id = p_user_id
  AND created_at >= DATE_TRUNC('month', CURRENT_DATE);

  RETURN v_usage < v_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to increment API usage
CREATE OR REPLACE FUNCTION increment_api_usage(
  p_user_id UUID,
  p_endpoint TEXT,
  p_tokens INTEGER DEFAULT 0,
  p_cost DECIMAL DEFAULT 0
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO api_usage_logs (user_id, endpoint, tokens_used, cost)
  VALUES (p_user_id, p_endpoint, p_tokens, p_cost);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert default industries
INSERT INTO industries (name, slug, description) VALUES
  ('E-commerce', 'ecommerce', 'Lojas virtuais, marketplaces e vendas online'),
  ('SaaS', 'saas', 'Software como serviço e aplicações web'),
  ('Educação', 'educacao', 'Escolas, cursos online e plataformas educacionais'),
  ('Saúde', 'saude', 'Clínicas, hospitais e serviços de saúde'),
  ('Fitness', 'fitness', 'Academias, personal trainers e bem-estar'),
  ('Restaurantes', 'restaurantes', 'Restaurantes, delivery e alimentação'),
  ('Imobiliário', 'imobiliario', 'Imobiliárias e corretores'),
  ('Consultoria', 'consultoria', 'Consultores e serviços profissionais'),
  ('Tecnologia', 'tecnologia', 'Empresas de tecnologia e startups'),
  ('Varejo', 'varejo', 'Lojas físicas e comércio em geral'),
  ('Serviços', 'servicos', 'Prestadores de serviços diversos'),
  ('Eventos', 'eventos', 'Organizadores de eventos e entretenimento'),
  ('Turismo', 'turismo', 'Agências de viagem e turismo'),
  ('Beleza', 'beleza', 'Salões, clínicas de estética e cosméticos'),
  ('Automotivo', 'automotivo', 'Concessionárias e serviços automotivos'),
  ('Financeiro', 'financeiro', 'Bancos, fintechs e serviços financeiros'),
  ('Marketing', 'marketing', 'Agências e profissionais de marketing'),
  ('Moda', 'moda', 'Marcas de roupas e acessórios'),
  ('Pets', 'pets', 'Pet shops e serviços para animais'),
  ('Outros', 'outros', 'Outros segmentos não listados')
ON CONFLICT (slug) DO NOTHING;

-- Insert sample templates
INSERT INTO templates (name, description, industry, type, structure, is_premium) VALUES
  (
    'Boas-vindas E-commerce',
    'Template de boas-vindas para novos clientes de e-commerce',
    'ecommerce',
    'transactional',
    '{
      "subject": "Bem-vindo à {{storeName}}!",
      "blocks": [
        {
          "type": "hero",
          "data": {
            "title": "Bem-vindo à nossa loja!",
            "subtitle": "Preparamos ofertas especiais para você"
          }
        }
      ]
    }'::jsonb,
    false
  ),
  (
    'Newsletter SaaS',
    'Template de newsletter para produtos SaaS',
    'saas',
    'newsletter',
    '{
      "subject": "Novidades do {{productName}} - {{month}}",
      "blocks": [
        {
          "type": "header",
          "data": {
            "logo": true,
            "menu": ["Features", "Pricing", "Support"]
          }
        }
      ]
    }'::jsonb,
    false
  ),
  (
    'Promoção Fitness',
    'Template para promoções de academias',
    'fitness',
    'campaign',
    '{
      "subject": "🏋️ Oferta especial: {{discount}}% OFF",
      "blocks": [
        {
          "type": "image",
          "data": {
            "alt": "Promoção Fitness"
          }
        }
      ]
    }'::jsonb,
    true
  )
ON CONFLICT DO NOTHING;

-- Final message
DO $$
BEGIN
  RAISE NOTICE '✅ MailTrendz Supabase setup completed successfully!';
  RAISE NOTICE '📝 Next steps:';
  RAISE NOTICE '   1. Update your .env file with Supabase credentials';
  RAISE NOTICE '   2. Run: npm install';
  RAISE NOTICE '   3. Run: npm run dev';
  RAISE NOTICE '   4. Test the API at http://localhost:8000';
END $$;