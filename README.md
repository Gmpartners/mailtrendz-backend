# MailTrendz Backend

Backend API do MailTrendz com integração Python AI Service.

## 🚀 Deploy Railway

### 1. Configurar Variáveis de Ambiente

No painel Railway, configure:

```bash
MONGODB_URL=mongodb+srv://...
JWT_SECRET=seu_jwt_secret
PYTHON_AI_SERVICE_URL=https://python-ai-service.railway.app
OPENROUTER_API_KEY=sk-or-v1-...
FRONTEND_URL=https://seu-frontend.railway.app
ALLOWED_ORIGINS=https://seu-frontend.railway.app
```

### 2. Deploy

```bash
# Conectar repositório ao Railway
# O build será automático: npm run build
# Start command: npm start
```

## 🎯 Endpoints Principais

- `GET /health` - Health check
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/register` - Registro
- `POST /api/v1/ai/generate` - Gerar email (proxy para Python AI)
- `GET /api/v1/projects` - Listar projetos
- `POST /api/v1/chats` - Chat

## 🔧 Arquitetura

```
Frontend → Backend Node.js → Python AI Service → OpenRouter/Claude
             ↓
         MongoDB Atlas
```

## 📋 Estrutura

```
src/
├── config/          # Configurações
├── controllers/     # Controllers
├── middleware/      # Middlewares
├── models/          # Models MongoDB
├── routes/          # Rotas da API
├── services/        # Serviços
├── utils/           # Utilitários
├── ai-service/      # Python AI Service
└── app.ts           # App principal
```