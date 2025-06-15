# 🚀 DEPLOY RAILWAY - MAILTRENDZ BACKEND

## 📋 Projeto Limpo e Pronto

O projeto foi completamente limpo e contém apenas arquivos essenciais:

### ✅ Estrutura Final:
```
Backend - MailTrendz/
├── src/                    # Código fonte
│   ├── ai-service/        # Python AI Service
│   ├── config/            # Configurações
│   ├── controllers/       # Controllers
│   ├── middleware/        # Middlewares
│   ├── models/            # Models
│   ├── routes/            # Rotas
│   ├── services/          # Serviços
│   ├── utils/             # Utilitários
│   ├── app.ts            # App principal
│   └── server.ts         # Servidor
├── .env                   # Configurações produção
├── .env.example          # Exemplo configurações
├── .gitignore            # Git ignore
├── .railwayignore        # Railway ignore
├── package.json          # Dependências
├── Procfile              # Comando start Railway
├── README.md             # Documentação
└── tsconfig.json         # TypeScript config
```

## 🚀 DEPLOY MANUAL NO RAILWAY

### ETAPA 1: Preparar Repositório

1. **Commit todas as mudanças:**
```bash
git add .
git commit -m "✅ Backend limpo e pronto para Railway"
git push origin main
```

### ETAPA 2: Deploy Backend Node.js

1. **Acessar Railway:** https://railway.app
2. **New Project → Deploy from GitHub repo**
3. **Selecionar:** Backend - MailTrendz
4. **Deploy automático** será iniciado

### ETAPA 3: Configurar Variáveis de Ambiente

No painel Railway do backend, adicionar:

```bash
NODE_ENV=production
PORT=8000
MONGODB_URL=mongodb+srv://gabriel12345:gabriel12345@cluster0.awhds.mongodb.net/mailtrendz
JWT_SECRET=mailtrendz_super_secret_key_2024_production
JWT_REFRESH_SECRET=mailtrendz_refresh_secret_key_2024_production
PYTHON_AI_SERVICE_URL=https://mailtrendz-python-ai.up.railway.app
OPENROUTER_API_KEY=sk-or-v1-sua_chave_openrouter_aqui
FRONTEND_URL=https://mailtrendz-frontend.up.railway.app
ALLOWED_ORIGINS=https://mailtrendz-frontend.up.railway.app
TRUST_PROXY=true
```

### ETAPA 4: Deploy Python AI Service

1. **New Project → Deploy from GitHub repo**
2. **Selecionar:** Backend - MailTrendz
3. **Root Directory:** `/src/ai-service`
4. **Configurar variáveis:**

```bash
PORT=5000
MONGODB_URL=mongodb+srv://gabriel12345:gabriel12345@cluster0.awhds.mongodb.net/mailtrendz
OPENROUTER_API_KEY=sk-or-v1-sua_chave_openrouter_aqui
AI_PRIMARY_MODEL=anthropic/claude-3.5-sonnet
DEBUG=false
```

### ETAPA 5: Atualizar URLs

1. **Obter URL Python AI Service**
2. **Atualizar no backend Node.js:**
   - `PYTHON_AI_SERVICE_URL=https://python-ai-url.railway.app`
3. **Redeploy backend**

## ✅ VERIFICAÇÃO

### 1. Backend Node.js:
```bash
curl https://seu-backend.railway.app/health
```

### 2. Python AI Service:
```bash
curl https://python-ai.railway.app/health
```

### 3. Integração:
```bash
curl https://seu-backend.railway.app/api/v1/ai/health
```

## 🎯 URLs FINAIS

- **Backend Node.js:** https://mailtrendz-backend-production-5f73.up.railway.app
- **Python AI:** https://mailtrendz-python-ai.up.railway.app
- **Frontend:** https://mailtrendz-frontend.up.railway.app

## 🔧 Build Info

- **Build Command:** `npm run build`
- **Start Command:** `npm start`
- **Node Version:** 18+
- **Python Version:** 3.11 (para AI Service)