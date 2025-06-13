# 🚀 MailTrendz Backend - Sistema Reestruturado

Sistema de geração de emails ultra-modernos com IA, agora com arquitetura otimizada e contexto inteligente.

## ✨ Nova Arquitetura v2.1

### **Principais Melhorias:**
- 🤖 **Python AI Service**: Microserviço dedicado para IA
- 💬 **Conversations Unificadas**: MongoDB otimizado para contexto
- 🔄 **Contexto Preservado**: IA lembra histórico completo
- ⚡ **Performance**: Estrutura otimizada para escala
- 🛡️ **Robustez**: Sistema de fallbacks inteligentes

---

## 🏗️ Arquitetura

```
MailTrendz Backend
├── Node.js + TypeScript      # API principal, auth, routing
├── Python AI Service         # IA, geração, chat inteligente  
├── MongoDB                    # Banco unificado otimizado
└── Frontend                   # React (separado)
```

### **Fluxo de Dados:**
```
Frontend → Node.js (auth/routing) → Python AI Service → MongoDB
```

---

## 📦 Instalação Rápida

### **1. Clone e Setup:**
```bash
git clone <repository>
cd Backend\ -\ MailTrendz
npm run setup
```

### **2. Configurar .env:**
```bash
# Editar .env com suas configurações
MONGODB_URL=mongodb://localhost:27017/mailtrendz
OPENROUTER_API_KEY=your-api-key-here
PYTHON_AI_SERVICE_URL=http://localhost:5000
```

### **3. Migrar Banco (se existente):**
```bash
npm run migration:conversations
```

### **4. Iniciar Serviços:**
```bash
# Terminal 1 - Node.js
npm run dev

# Terminal 2 - Python AI  
cd src/ai-service
pip install -r requirements.txt
python app.py
```

---

## 🗄️ Nova Estrutura MongoDB

### **Modelo Conversation (Unificado):**
```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  projectId: ObjectId,
  
  conversation: {
    title: String,
    messages: [{
      id: ObjectId,
      type: 'user' | 'ai',
      content: String,
      timestamp: Date,
      metadata: {
        emailUpdated: Boolean,
        modifications: [String],
        confidence: Number
      }
    }],
    
    context: {
      projectSnapshot: {
        name: String,
        currentHTML: String,
        industry: String,
        tone: String
      },
      conversationState: {
        pendingModifications: [String],
        userPreferences: Object
      }
    }
  },
  
  stats: {
    totalMessages: Number,
    emailModifications: Number,
    averageResponseTime: Number
  }
}
```

### **Vantagens:**
- ✅ **Contexto preservado** entre mensagens
- ✅ **Performance otimizada** (menos queries)
- ✅ **Escalabilidade** melhorada
- ✅ **Sincronização** projeto-conversa

---

## 🤖 Python AI Service

### **Recursos:**
- 🎨 **Email Generator**: Templates ultra-modernos
- 🔧 **CSS Expert**: Otimização para email clients
- 💬 **Smart Chat**: Contexto inteligente
- 🔍 **HTML Optimizer**: Validação e correções
- 📊 **Performance Monitor**: Métricas em tempo real

### **Endpoints Principais:**
```
POST /generate           # Gerar email
POST /modify             # Modificar email existente
POST /chat/process       # Chat inteligente
POST /optimize-css       # Otimizar CSS
POST /validate           # Validar HTML
GET  /health            # Status do serviço
GET  /metrics           # Métricas de performance
```

### **Modelos IA Suportados:**
- `anthropic/claude-3.5-sonnet` (primário)
- `anthropic/claude-3-sonnet-20240229` (backup)
- `anthropic/claude-3-haiku-20240307` (backup)
- `openai/gpt-4-turbo-preview` (backup)

---

## 💬 Sistema de Chat Inteligente

### **Detecção de Intenções:**
- 🎨 **Mudança de cores**: "muda para azul"
- ✏️ **Modificação de texto**: "altera o título"
- 🔲 **Mudança de CTA**: "botão para 'Comprar'"
- 🎯 **Adição de conteúdo**: "adiciona desconto"
- ❓ **Perguntas gerais**: sobre email marketing

### **Contexto Inteligente:**
- 📚 **Histórico completo** da conversa
- 🏗️ **Estado atual** do projeto/email
- 🎯 **Intenções detectadas** automaticamente
- 🔄 **Modificações aplicadas** em tempo real

---

## 🛠️ API Endpoints

### **Node.js Backend (Port 8000):**
```
# Autenticação
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/refresh

# Projetos
GET    /api/v1/projects
POST   /api/v1/projects
GET    /api/v1/projects/:id
PUT    /api/v1/projects/:id
DELETE /api/v1/projects/:id

# Conversas
GET  /api/v1/chats/project/:projectId
POST /api/v1/chats/project/:projectId/messages
GET  /api/v1/chats/user/conversations

# IA (Proxy para Python)
POST /api/v1/ai/generate
POST /api/v1/ai/improve
GET  /api/v1/ai/health
```

### **Python AI Service (Port 5000):**
```
POST /generate              # Geração de email
POST /modify                # Modificação inteligente
POST /chat/process          # Chat com contexto
POST /optimize-css          # Otimização CSS
GET  /health               # Status completo
GET  /metrics              # Métricas detalhadas
```

---

## 🔧 Comandos Úteis

### **Desenvolvimento:**
```bash
npm run dev                    # Iniciar desenvolvimento
npm run build                 # Build para produção
npm run start                 # Iniciar produção
```

### **Banco de Dados:**
```bash
npm run migration:conversations  # Migrar para nova estrutura
npm run migration:cleanup       # Limpar collections antigas
```

### **Logs e Debug:**
```bash
npm run logs:clear             # Limpar logs
tail -f logs/app.log          # Monitorar logs
```

### **Python AI Service:**
```bash
cd src/ai-service
python app.py                 # Iniciar serviço
pip install -r requirements.txt  # Instalar deps
```

---

## 📊 Monitoramento

### **Health Checks:**
- 🟢 **Node.js**: `GET /health`
- 🐍 **Python AI**: `GET http://localhost:5000/health`
- 📊 **Métricas**: `GET http://localhost:5000/metrics`
- 📚 **API Docs**: `GET http://localhost:5000/docs`

### **Logs:**
- 📝 **App logs**: `./logs/app.log`
- 🐍 **AI logs**: `./logs/ai-service.log`
- 🔍 **Error logs**: `./logs/error.log`

---

## 🚀 Deploy

### **Variáveis de Ambiente (Produção):**
```bash
NODE_ENV=production
PORT=8000
MONGODB_URL=mongodb+srv://...
OPENROUTER_API_KEY=your-key
PYTHON_AI_SERVICE_URL=http://python-ai:5000
```

### **Docker:**
```bash
npm run docker:build         # Build imagem
npm run docker:dev           # Desenvolvimento
npm run docker:dev:down      # Parar containers
```

---

## 🔒 Segurança

### **Recursos:**
- 🛡️ **Rate limiting** configurável
- 🔐 **JWT authentication**
- 🚫 **CORS protection**
- 🔒 **Helmet security headers**
- 📝 **Input validation**
- 🚧 **SQL injection protection**

---

## 📈 Performance

### **Otimizações:**
- ⚡ **MongoDB indexes** otimizados
- 🚀 **Connection pooling**
- 💾 **Conversation caching**
- 🔄 **AI response caching**
- 📊 **Performance monitoring**

### **Limites (Configuráveis):**
```javascript
// Rate limits por minuto
FREE: 50 projetos, 100 chats
PRO: 150 projetos, 300 chats  
ENTERPRISE: 500 projetos, 1000 chats
```

---

## 🆘 Troubleshooting

### **Problemas Comuns:**

#### **1. IA não responde:**
```bash
# Verificar Python AI Service
curl http://localhost:5000/health

# Verificar logs
tail -f logs/ai-service.log
```

#### **2. Erro de conexão MongoDB:**
```bash
# Verificar MongoDB
mongo --eval "db.adminCommand('ismaster')"

# Verificar .env
cat .env | grep MONGODB_URL
```

#### **3. Chat sem contexto:**
```bash
# Executar migração
npm run migration:conversations

# Verificar collections
mongo mailtrendz --eval "show collections"
```

#### **4. OpenRouter API falha:**
```bash
# Testar API key
curl -H "Authorization: Bearer $OPENROUTER_API_KEY" \
     https://openrouter.ai/api/v1/models
```

---

## 📚 Documentação Adicional

- 🤖 **Python AI Service**: `src/ai-service/README.md`
- 🗄️ **Database Schema**: `docs/database-schema.md`
- 🔌 **API Reference**: `docs/api-reference.md`
- 🚀 **Deploy Guide**: `docs/deployment.md`

---

## 🎯 Próximas Versões

### **v2.2 (Planejado):**
- 🔄 **Real-time collaboration**
- 📊 **Advanced analytics** 
- 🎨 **Visual email builder**
- 🤖 **Multi-model AI support**

---

## 🤝 Suporte

- 📧 **Email**: support@mailtrendz.com
- 📚 **Docs**: [Documentation](./docs/)
- 🐛 **Issues**: [GitHub Issues](./issues)
- 💬 **Discord**: [Community](./discord)

---

**MailTrendz v2.1** - Sistema de emails ultra-modernos com IA avançada! 🚀✨