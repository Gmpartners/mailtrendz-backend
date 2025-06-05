# MailTrendz Backend 🚀

Backend API para MailTrendz - Plataforma de geração de emails com Inteligência Artificial.

## 🌟 Funcionalidades

- **Geração de Emails com IA**: Crie emails profissionais usando OpenRouter
- **Chat Inteligente**: Converse com IA para melhorar seus emails
- **Gerenciamento de Projetos**: Organize e versione seus emails
- **Autenticação Segura**: JWT + Refresh tokens
- **Rate Limiting**: Proteção contra abuso
- **Analytics**: Métricas de performance dos emails
- **Multi-tenancy**: Suporte a diferentes planos de assinatura

## 🛠️ Stack Tecnológica

- **Runtime**: Node.js 18+ com TypeScript
- **Framework**: Express.js
- **Banco de Dados**: MongoDB com Mongoose
- **IA**: OpenRouter API (Claude, GPT-4, etc.)
- **Autenticação**: JWT + bcrypt
- **Validação**: express-validator + Joi
- **Logs**: Winston
- **Segurança**: Helmet + CORS + Rate Limiting

## 🚀 Setup Rápido

### 1. Pré-requisitos

```bash
# Node.js 18+
node --version

# MongoDB local ou MongoDB Atlas
mongod --version

# NPM ou Yarn
npm --version
```

### 2. Instalação

```bash
# Clonar repositório (se aplicável)
git clone <repo-url>
cd Backend - MailTrendz

# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env
```

### 3. Configuração do .env

```env
# Database
MONGODB_URI=mongodb://localhost:27017/mailtrendz

# JWT Secrets (IMPORTANTE: Gerar secrets seguros em produção)
JWT_SECRET=sua-chave-secreta-super-forte-aqui
JWT_REFRESH_SECRET=sua-chave-refresh-secreta-aqui

# OpenRouter (obrigatório para IA)
OPENROUTER_API_KEY=sk-or-v1-sua-chave-aqui

# Server
PORT=8000
NODE_ENV=development

# Frontend
FRONTEND_URL=http://localhost:5173
```

### 4. Iniciar Aplicação

```bash
# Desenvolvimento com hot reload
npm run dev

# Build para produção
npm run build
npm start

# Seed database com dados de teste
npm run db:seed
```

## 📚 API Endpoints

### Base URL: `http://localhost:8000/api/v1`

### 🔐 Autenticação (`/auth`)

```bash
POST /auth/register          # Registrar usuário
POST /auth/login             # Login
POST /auth/refresh-token     # Renovar token
POST /auth/logout            # Logout
GET  /auth/me                # Perfil do usuário
PUT  /auth/profile           # Atualizar perfil
POST /auth/request-password-reset # Resetar senha
```

### 📧 Projetos (`/projects`)

```bash
GET    /projects             # Listar projetos do usuário
POST   /projects             # Criar novo projeto (com IA)
GET    /projects/:id         # Buscar projeto específico
PUT    /projects/:id         # Atualizar projeto
DELETE /projects/:id         # Deletar projeto
POST   /projects/:id/duplicate # Duplicar projeto
POST   /projects/:id/improve   # Melhorar email com IA
GET    /projects/:id/analytics # Analytics do projeto
```

### 💬 Chat (`/chats`)

```bash
GET    /chats                      # Listar chats do usuário
POST   /chats                      # Criar novo chat
GET    /chats/project/:projectId   # Chat por projeto
POST   /chats/:chatId/messages     # Enviar mensagem (IA responde)
GET    /chats/:chatId/messages     # Histórico de mensagens
PUT    /chats/:id                  # Atualizar chat
DELETE /chats/:id                  # Deletar chat
```

### 🤖 IA (`/ai`)

```bash
GET  /ai/health              # Status do serviço de IA
GET  /ai/models              # Modelos disponíveis
GET  /ai/config              # Configurações da IA

# Endpoints de teste (desenvolvimento)
POST /ai/test/email-generation
POST /ai/test/email-improvement
POST /ai/test/chat
```

### 👤 Usuário (`/users`)

```bash
GET    /users/dashboard      # Dashboard com estatísticas
GET    /users/settings       # Configurações do usuário
PUT    /users/settings       # Atualizar configurações
GET    /users/notifications  # Notificações
GET    /users/export-data    # Exportar dados (LGPD)
DELETE /users/account        # Deletar conta
```

## 🔧 Desenvolvimento

### Scripts Disponíveis

```bash
npm run dev          # Desenvolvimento com hot reload
npm run build        # Build para produção
npm run start        # Iniciar versão de produção
npm run test         # Executar testes
npm run test:watch   # Testes em modo watch
npm run lint         # Verificar código
npm run lint:fix     # Corrigir problemas de lint
npm run db:seed      # Popular banco com dados de teste
npm run logs:clear   # Limpar logs
```

### Estrutura do Projeto

```
src/
├── config/          # Configurações (DB, CORS, etc.)
├── controllers/     # Controladores das rotas
├── middleware/      # Middlewares customizados
├── models/          # Schemas do MongoDB
├── routes/          # Definição de rotas
├── services/        # Lógica de negócio
├── types/           # Tipos TypeScript
├── utils/           # Utilitários e constantes
├── app.ts           # Configuração do Express
└── server.ts        # Entry point da aplicação
```

## 🧪 Testando a API

### 1. Health Check

```bash
curl http://localhost:8000/health
```

### 2. Registrar Usuário

```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Seu Nome",
    "email": "seu@email.com",
    "password": "MinhaSenh@123",
    "confirmPassword": "MinhaSenh@123"
  }'
```

### 3. Criar Projeto com IA

```bash
# Primeiro faça login e pegue o token
TOKEN="seu-jwt-token-aqui"

curl -X POST http://localhost:8000/api/v1/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "prompt": "Criar um email de boas-vindas para novos clientes SaaS",
    "type": "welcome",
    "industry": "Tecnologia",
    "tone": "amigável"
  }'
```

## 🔑 Configuração do OpenRouter

1. Acesse [OpenRouter.ai](https://openrouter.ai)
2. Crie uma conta e obtenha sua API key
3. Configure no `.env`:
   ```env
   OPENROUTER_API_KEY=sk-or-v1-sua-chave-aqui
   ```

### Modelos Recomendados

- **Principal**: `anthropic/claude-3.5-sonnet` (melhor qualidade)
- **Fallback**: `openai/gpt-4-turbo` (alternativa robusta)
- **Rápido**: `anthropic/claude-3-haiku` (respostas rápidas)
- **Econômico**: `openai/gpt-3.5-turbo` (baixo custo)

## 📊 Monitoring e Logs

### Visualizar Logs

```bash
# Logs em tempo real
tail -f logs/combined.log

# Apenas erros
tail -f logs/error.log

# Limpar logs
npm run logs:clear
```

### Health Checks

- **API**: `GET /health`
- **Database**: `GET /health` (inclui status do MongoDB)
- **IA**: `GET /api/v1/ai/health`

## 🚀 Deploy

### Docker (Recomendado)

```bash
# Build da imagem
docker build -t mailtrendz-backend .

# Executar container
docker run -p 8000:8000 \
  -e MONGODB_URI=mongodb://host.docker.internal:27017/mailtrendz \
  -e OPENROUTER_API_KEY=sua-chave \
  -e JWT_SECRET=sua-chave-secreta \
  mailtrendz-backend
```

### Deploy Manual

```bash
# Build
npm run build

# Configurar variáveis de ambiente de produção
export NODE_ENV=production
export MONGODB_URI=sua-mongodb-uri-producao
export OPENROUTER_API_KEY=sua-chave

# Iniciar
npm run start:prod
```

## 🔒 Segurança

### Configurações Implementadas

- **Helmet**: Headers de segurança
- **CORS**: Controle de origem
- **Rate Limiting**: Prevenção de abuso
- **JWT**: Autenticação stateless
- **Bcrypt**: Hash de senhas
- **Validação**: Input validation
- **Logs**: Auditoria completa

### Rate Limits

- **Geral**: 100 req/15min
- **Auth**: 5 req/15min
- **IA**: 10 req/min
- **Projetos**: 20 req/min

## 🛡️ Planos e Limites

### Free Tier
- 10 projetos/mês
- 50 requests IA/mês
- 100 mensagens chat/mês
- 5 projetos max

### Pro Tier
- 100 projetos/mês
- 500 requests IA/mês
- 1000 mensagens chat/mês
- 50 projetos max

### Enterprise
- 1000 projetos/mês
- 5000 requests IA/mês
- 10000 mensagens chat/mês
- 500 projetos max

## 📝 Changelog

### v1.0.0 (Atual)
- ✅ Sistema de autenticação completo
- ✅ CRUD de projetos com IA
- ✅ Chat inteligente
- ✅ Rate limiting e segurança
- ✅ Analytics básico
- ✅ Multi-tier subscription

## 🤝 Contribuição

1. Fork o projeto
2. Crie sua feature branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## 📞 Suporte

- **Email**: suporte@mailtrendz.com
- **Docs**: [docs.mailtrendz.com](https://docs.mailtrendz.com)
- **Status**: [status.mailtrendz.com](https://status.mailtrendz.com)

## 📄 Licença

MIT License - veja o arquivo [LICENSE](LICENSE) para detalhes.

---

**Feito com ❤️ por Gabriel usando Node.js + IA**