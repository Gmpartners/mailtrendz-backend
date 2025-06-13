# 🚀 RAILWAY DEPLOY - PASSO A PASSO DETALHADO

## 🎯 ETAPA 1: SETUP INICIAL

### 1.1 Criar Conta Railway
1. **Acesse:** https://railway.app
2. **Clique:** "Start a New Project"
3. **Conecte:** Sua conta GitHub
4. **Autorize:** Railway no GitHub

---

## 🐍 ETAPA 2: DEPLOY PYTHON AI SERVICE

### 2.1 Criar Projeto Python AI
1. **No Railway Dashboard:**
   - Clique "New Project"
   - Selecione "Deploy from GitHub repo"
   - Escolha seu repositório: `Backend - MailTrendz`
   - **IMPORTANTE:** Clique "Configure" antes de deploy

### 2.2 Configurar Root Directory
1. **Em Settings → Source:**
   - Root Directory: `src/ai-service`
   - Watch Paths: `src/ai-service/**`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `python app.py`

### 2.3 Environment Variables Python AI
**Vá em Variables e adicione:**

```bash
# OBRIGATÓRIAS
OPENROUTER_API_KEY=sk-or-v1-2fd78d6d42a8ab5a90b52459dc51d7cf2f9a3d40ec4bce512568d1167ff9c1f
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
MONGODB_URI=mongodb+srv://mailtrendz:mailtrendz123@mailtrendz-cluster.690h6t1.mongodb.net/mailtrendz?retryWrites=true&w=majority&appName=mailtrendz-cluster
PORT=5000

# CONFIGURAÇÃO
NODE_ENV=production
LOG_LEVEL=info
FRONTEND_URL=http://localhost:5173

# PYTHON ESPECÍFICAS
PYTHONPATH=/app
PYTHON_VERSION=3.11
```

### 2.4 Deploy Python AI
1. **Clique:** "Deploy"
2. **Aguarde:** Build completar (3-5 minutos)
3. **Verifique:** Logs não têm erros críticos
4. **Copie:** A URL gerada (exemplo: `https://python-ai-production.railway.app`)

### 2.5 Testar Python AI
```bash
# Teste no browser ou curl:
https://seu-python-ai.railway.app/health

# Deve retornar:
{
  "status": "healthy",
  "services": {...}
}
```

---

## 🟢 ETAPA 3: DEPLOY NODE.JS BACKEND

### 3.1 Criar Segundo Projeto
1. **No Railway Dashboard:**
   - Clique "New Project" (novo projeto separado)
   - "Deploy from GitHub repo"
   - Mesmo repositório: `Backend - MailTrendz`
   - **IMPORTANTE:** Root directory será a raiz `/`

### 3.2 Configurar Node.js Build
1. **Em Settings → Source:**
   - Root Directory: `/` (raiz)
   - Build Command: `npm run build`
   - Start Command: `npm start`

### 3.3 Environment Variables Node.js
**Vá em Variables e adicione TODAS suas env vars atuais + a nova:**

```bash
# SUAS VARIÁVEIS EXISTENTES (do Vercel)
NODE_ENV=production
PORT=10000
JWT_SECRET=mailtrendz-jwt-secret-super-long-production-key-2024
JWT_REFRESH_SECRET=mailtrendz-refresh-jwt-secret-super-long-production-key-2024
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d
MONGODB_URI=mongodb+srv://mailtrendz:mailtrendz123@mailtrendz-cluster.690h6t1.mongodb.net/mailtrendz?retryWrites=true&w=majority&appName=mailtrendz-cluster
OPENROUTER_API_KEY=sk-or-v1-2fd78d6d42a8ab5a90b52459dc51d7cf2f9a3d40ec4bce512568d1167ff9c1f
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
FRONTEND_URL=http://localhost:5173
LOG_LEVEL=debug

# 🚨 NOVA VARIÁVEL CRÍTICA (URL do seu Python AI do passo anterior)
PYTHON_AI_SERVICE_URL=https://seu-python-ai.railway.app
```

### 3.4 Deploy Node.js
1. **Clique:** "Deploy"
2. **Aguarde:** Build completar (2-3 minutos)
3. **Copie:** URL do Node.js (exemplo: `https://backend-production.railway.app`)

### 3.5 Testar Node.js
```bash
# Teste:
https://seu-backend.railway.app/health

# Deve retornar:
{
  "success": true,
  "data": {
    "status": "ok",
    "services": {
      "pythonAI": {"status": "available"}
    }
  }
}
```

---

## 🔗 ETAPA 4: CONECTAR SERVIÇOS

### 4.1 Atualizar Frontend URL
**No Python AI Service (projeto 1):**
1. Vá em Variables
2. Atualize: `FRONTEND_URL=https://seu-backend.railway.app`
3. Redeploy automático

### 4.2 Verificar Conexão
**Teste a integração:**
```bash
# Endpoint de teste de conectividade:
GET https://seu-backend.railway.app/api/v1/ai/health

# Deve mostrar Python AI conectado
```

---

## ✅ ETAPA 5: CONFIGURAR DOMÍNIOS (OPCIONAL)

### 5.1 Domínios Customizados
**Para cada projeto no Railway:**
1. **Settings → Networking**
2. **Custom Domain:** `api.seudominio.com` (backend)
3. **Custom Domain:** `ai.seudominio.com` (python)

### 5.2 Atualizar URLs
**Se usar domínios customizados, atualize:**
- `PYTHON_AI_SERVICE_URL` no Node.js
- `FRONTEND_URL` no Python AI

---

## 🔍 ETAPA 6: VALIDAÇÃO FINAL

### 6.1 Checklist de Testes
```bash
✅ Python AI Health: https://seu-python-ai.railway.app/health
✅ Node.js Health: https://seu-backend.railway.app/health  
✅ API Docs: https://seu-python-ai.railway.app/docs
✅ Conectividade: GET /api/v1/ai/health (deve mostrar Python conectado)
✅ Logs sem erros críticos em ambos projetos
```

### 6.2 Teste de Funcionalidade
**Via Postman ou similar:**
```bash
# 1. Teste geração de email
POST https://seu-backend.railway.app/api/v1/ai/generate
Headers: Authorization: Bearer SEU_JWT_TOKEN
Body: {
  "prompt": "Crie um email de teste",
  "industry": "tecnologia"
}

# 2. Teste chat
POST https://seu-backend.railway.app/api/v1/chats/project/PROJECT_ID/messages
Headers: Authorization: Bearer SEU_JWT_TOKEN  
Body: {
  "content": "Olá, como está?"
}
```

---

## 📊 MONITORAMENTO

### 6.3 Railway Dashboard
**Para cada projeto:**
- **Metrics:** CPU, Memória, Network
- **Logs:** Real-time logs
- **Deployments:** Histórico de deploys
- **Settings:** Configurações

### 6.4 URLs Finais
**Anote suas URLs:**
- **Node.js Backend:** `https://seu-backend.railway.app`
- **Python AI Service:** `https://seu-python-ai.railway.app`
- **Frontend:** (mantenha onde está ou migre também)

---

## 🚨 TROUBLESHOOTING

### Problemas Comuns:

1. **Build falha Python:**
   - Verificar requirements.txt existe
   - Verificar Python version 3.11

2. **Build falha Node.js:**
   - Verificar package.json scripts
   - npm run build funciona local

3. **Serviços não conectam:**
   - Verificar PYTHON_AI_SERVICE_URL correto
   - Verificar firewall/CORS

4. **Database errors:**
   - Verificar MONGODB_URI correto
   - Verificar IP whitelist MongoDB Atlas

---

## 🎉 CONCLUSÃO

**Após completar todos os passos:**

✅ **Sistema 100% funcional** no Railway  
✅ **Ambos serviços** comunicando  
✅ **Domínios configurados** (opcional)  
✅ **Monitoramento ativo**  
✅ **Logs estruturados**  

**Seu MailTrendz v2.1 estará rodando em produção profissional!** 🚀