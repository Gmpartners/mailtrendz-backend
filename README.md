# MailTrendz Backend - Sistema Unificado Node.js

## 🎯 **Arquitetura Unificada**

```
┌─────────────────┐    ┌──────────────────────────────────────┐    ┌─────────────────┐
│   Frontend      │────│         Backend Node.js             │────│   OpenRouter    │
│  (React/TS)     │    │        (Express/TS)                 │    │   (Claude AI)   │
│                 │    │                                      │    │                 │
│ • HTML Editor   │    │ • IA Service integrada               │    │ • Claude Sonnet │
│ • Chat UI       │    │ • Geração HTML via OpenRouter       │    │ • GPT Fallbacks │
│ • Project Mgmt  │    │ • Auth/Projects/Chat                │    │ • Multi-models  │
└─────────────────┘    └──────────────────────────────────────┘    └─────────────────┘
```

## ⚡ **Funcionalidades Core**

### **API Endpoints**

#### **AI Routes (`/api/v1/ai/`)**
- `POST /generate` - Gera HTML via OpenRouter (Claude)
- `POST /modify` - Modifica HTML existente  
- `POST /validate` - Valida HTML para email
- `POST /chat` - Chat inteligente com IA
- `GET /health` - Status dos serviços
- `GET /test-connection` - Teste conectividade OpenRouter

#### **Auth Routes (`/api/v1/auth/`)**
- `POST /login` - Login usuário
- `POST /register` - Registro usuário
- `POST /refresh` - Refresh token
- `POST /logout` - Logout usuário

#### **Project Routes (`/api/v1/projects/`)**
- `GET /` - Lista projetos usuário
- `POST /` - Cria novo projeto
- `GET /:id` - Busca projeto específico
- `PUT /:id` - Atualiza projeto
- `DELETE /:id` - Remove projeto

#### **Chat Routes (`/api/v1/chats/`)**
- `GET /project/:projectId` - Chat do projeto
- `POST /` - Cria novo chat
- `POST /messages` - Adiciona mensagem

## 🛠️ **Configuração**

### **Variáveis de Ambiente (.env)**
```env
# Aplicação
NODE_ENV=development
PORT=8000
API_VERSION=v1
APP_URL=http://localhost:8000

# Supabase (Database)
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua_chave_anonima
SUPABASE_SERVICE_ROLE=sua_chave_service_role

# JWT (Autenticação)
JWT_SECRET=sua_chave_jwt_super_secreta
JWT_REFRESH_SECRET=sua_chave_refresh_secreta

# OpenRouter IA (Sistema Unificado)
OPENROUTER_API_KEY=sk-or-v1-sua_chave_aqui
OPENROUTER_MODEL=anthropic/claude-sonnet-4
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1

# CORS
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:8000
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# Admin
ADMIN_EMAIL=admin@mailtrendz.com
```

### **Instalação**
```bash
# Instalar dependências
npm install

# Rodar desenvolvimento
npm run dev

# Build para produção  
npm run build
npm start
```

## 🤖 **Sistema IA Integrado (OpenRouter)**

### **Fluxo de Geração HTML**
```typescript
async generateEmail(prompt) {
  try {
    // 1. Chamar OpenRouter diretamente
    const response = await openRouterClient.post('/chat/completions', {
      model: 'anthropic/claude-sonnet-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ]
    })
    
    return processHTMLResponse(response.data)
  } catch (error) {
    // 2. Fallback para templates locais
    return generateFallbackHTML(prompt)
  }
}
```

### **Modelos Disponíveis**
```typescript
const models = {
  primary: "anthropic/claude-sonnet-4",
  fallbacks: [
    "anthropic/claude-3-sonnet-20240229",
    "anthropic/claude-3-haiku-20240307", 
    "openai/gpt-4-turbo-preview"
  ]
}
```

### **Templates de Fallback**
```typescript
const templates = {
  promotional: generatePromotionalHTML(prompt),
  newsletter: generateNewsletterHTML(prompt), 
  welcome: generateWelcomeHTML(prompt),
  generic: generateGenericHTML(prompt)
}
```

## 📊 **Database Schema (Supabase)**

### **Tabelas Principais**

#### **users**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR UNIQUE NOT NULL,
  password_hash VARCHAR,
  name VARCHAR,
  avatar_url VARCHAR,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### **projects**
```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  type VARCHAR DEFAULT 'email',
  content JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### **chats**
```sql
CREATE TABLE chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  title VARCHAR,
  context JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### **chat_messages**
```sql
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
  role VARCHAR CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### **api_usage**
```sql
CREATE TABLE api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  endpoint VARCHAR NOT NULL,
  tokens_used INTEGER DEFAULT 0,
  cost DECIMAL(10,6) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## 🔧 **Controllers Principais**

### **ai.controller.ts**
```typescript
// Geração HTML com OpenRouter + fallback
export const generateEmail = async (req, res) => {
  const { prompt, industry = 'geral', tone = 'professional' } = req.body
  
  try {
    // Verificar se IA está disponível
    const iaAvailable = iaService.isEnabled()
    
    if (iaAvailable) {
      // Usar OpenRouter
      const result = await iaService.generateHTML({ 
        userInput: prompt,
        context: { industry, tone }
      })
      res.json({ success: true, data: result })
    } else {
      // Fallback automático
      const fallback = generateFallbackHTML(prompt)
      res.json({ success: true, data: fallback, metadata: { fallback_mode: true } })
    }
  } catch (error) {
    // Fallback em caso de erro
    const fallback = generateFallbackHTML(prompt)
    res.json({ success: true, data: fallback, metadata: { fallback_mode: true, error: error.message } })
  }
}
```

### **chat.controller.ts**
```typescript
// Chat inteligente com contexto
export const processChat = async (req, res) => {
  const { message, chat_id, project_id } = req.body
  const userId = req.user.id
  
  try {
    // Usar IA para resposta inteligente
    const iaResponse = await iaService.generateHTML({
      userInput: message,
      context: { chat_id, project_id, isChat: true }
    })
    
    res.json({ 
      success: true, 
      data: {
        response: iaResponse.response,
        html: iaResponse.html,
        suggestions: ['HTML gerado via chat', 'Você pode pedir modificações']
      }
    })
  } catch (error) {
    res.json({
      success: true,
      data: {
        response: 'Desculpe, não consegui processar sua solicitação no momento.',
        suggestions: ['Tente reformular sua pergunta', 'Use o editor manual']
      }
    })
  }
}
```

## 🚀 **Deploy**

### **Railway (Recomendado)**
```bash
# 1. Conectar repositório
railway link

# 2. Configurar variáveis
railway variables:set NODE_ENV=production
railway variables:set OPENROUTER_API_KEY=sk-or-v1-sua_chave
railway variables:set SUPABASE_URL=sua_url
# ... outras variáveis

# 3. Deploy
railway up
```

### **Heroku**
```bash
# 1. Criar app
heroku create mailtrendz-backend

# 2. Configurar variáveis
heroku config:set NODE_ENV=production
heroku config:set OPENROUTER_API_KEY=sk-or-v1-sua_chave
heroku config:set SUPABASE_URL=sua_url

# 3. Deploy
git push heroku main
```

### **Docker**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 8000
CMD ["npm", "start"]
```

## 📈 **Monitoramento**

### **Health Checks**
```typescript
// Endpoint: GET /api/v1/ai/health
{
  "overall_status": "healthy",
  "services": {
    "nodejs_backend": { "status": "healthy", "uptime": 3600 },
    "ia_service": { 
      "status": "healthy", 
      "model": "anthropic/claude-sonnet-4",
      "enabled": true 
    }
  },
  "ia_enabled": true,
  "ia_available": true,
  "system_type": "nodejs_unified",
  "version": "4.0.0-nodejs-only"
}
```

### **Test Connection**
```typescript
// Endpoint: GET /api/v1/ai/test-connection
{
  "connected": true,
  "enabled": true,
  "responseTime": 850,
  "tests": [
    { "endpoint": "health_check", "success": true },
    { "endpoint": "test_generation", "success": true, "html_length": 2450 }
  ],
  "model": "anthropic/claude-sonnet-4",
  "system_type": "nodejs_unified"
}
```

## 🐛 **Debugging**

### **Problemas Comuns**

#### **IA não responde**
```bash
# Verificar status
curl http://localhost:8000/api/v1/ai/health

# Testar conexão OpenRouter
curl http://localhost:8000/api/v1/ai/test-connection

# Verificar API key
echo $OPENROUTER_API_KEY
```

#### **Database errors**
```bash
# Verificar conexão Supabase
curl -H "apikey: $SUPABASE_ANON_KEY" "$SUPABASE_URL/rest/v1/users?select=id"

# Ver logs do servidor
npm run dev
```

#### **CORS issues**
```typescript
// Verificar ALLOWED_ORIGINS no .env
ALLOWED_ORIGINS=http://localhost:5173,https://seu-frontend.com
```

## 📚 **Scripts Úteis**

```json
{
  "scripts": {
    "dev": "nodemon --exec ts-node src/server.ts",
    "build": "tsc --noEmitOnError false --skipLibCheck true", 
    "start": "node dist/server.js",
    "prepare": "npm run build"
  }
}
```

## 🔒 **Segurança**

### **Middleware Stack**
- **helmet** - Headers de segurança
- **cors** - Controle de origem
- **rate-limit** - Limit de requisições
- **auth** - JWT validation
- **compression** - Compressão de responses

### **Rate Limiting**
```typescript
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 100, // max requests por window
  message: 'Muitas requisições, tente novamente em 15 minutos'
})
```

### **API Usage Tracking**
```typescript
// Rastrear uso da API por usuário
await supabase.rpc('increment_api_usage', {
  p_user_id: userId,
  p_endpoint: '/ai/generate',
  p_tokens: estimatedTokens,
  p_cost: estimatedCost
})
```

## ⚡ **Performance**

### **Otimizações**
- ✅ **CSS Inline** - Para compatibilidade com email clients
- ✅ **Cache Inteligente** - Responses similares
- ✅ **Fallback Rápido** - Templates prontos
- ✅ **Compressão** - Responses comprimidas
- ✅ **Connection Pooling** - Supabase otimizado

### **Métricas**
- **Response Time**: < 2s para geração IA
- **Fallback Time**: < 100ms para templates
- **Uptime**: 99.9% target
- **Error Rate**: < 1%

---

## ✅ **Checklist Deploy**

- [ ] Variáveis ambiente configuradas
- [ ] OPENROUTER_API_KEY válida e funcional
- [ ] Supabase conectado e tabelas criadas
- [ ] Health checks passando
- [ ] Test connection OK
- [ ] CORS configurado para frontend
- [ ] Rate limiting ativo
- [ ] Logs estruturados funcionando
- [ ] API usage tracking ativo

**Sistema unificado pronto para produção! 🚀**

## 🏆 **Vantagens da Arquitetura Unificada**

✅ **Simplicidade** - Um só serviço para manter  
✅ **Performance** - Sem latência entre serviços  
✅ **Confiabilidade** - Menos pontos de falha  
✅ **Escalabilidade** - Node.js + OpenRouter  
✅ **Economia** - Menos recursos de infraestrutura  
✅ **Manutenção** - Codebase unificado