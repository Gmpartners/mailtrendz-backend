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