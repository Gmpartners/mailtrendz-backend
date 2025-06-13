# 🚀 MailTrendz - Sistema Híbrido Node.js + Python AI

**MailTrendz é uma plataforma avançada de geração de emails com IA, agora com arquitetura híbrida otimizada para máxima performance e capacidades de IA.**

## 📋 Índice

- [🏗️ Arquitetura](#️-arquitetura)
- [✨ Funcionalidades](#-funcionalidades)
- [🚀 Início Rápido](#-início-rápido)
- [⚙️ Configuração](#️-configuração)
- [🛠️ Desenvolvimento](#️-desenvolvimento)
- [🐳 Docker](#-docker)
- [📡 API](#-api)
- [🧪 Testes](#-testes)
- [🚢 Deploy](#-deploy)
- [🤝 Contribuição](#-contribuição)

## 🏗️ Arquitetura

### Sistema Híbrido Revolucionário

```
┌─────────────────────────────────────────────────────────────┐
│                    MailTrendz v2.0                          │
├─────────────────────────────────────────────────────────────┤
│  Frontend (React)  →  Node.js API  →  Python AI Service    │
│                            ↓              ↓                │
│                      MongoDB ←────────────┘                │
└─────────────────────────────────────────────────────────────┘
```

### Componentes

#### 🟢 **Node.js API** (Porta 8000)
- **Função**: Gateway principal, autenticação, gerenciamento de dados
- **Stack**: TypeScript, Express, MongoDB, JWT
- **Responsabilidades**:
  - Autenticação e autorização
  - CRUD de projetos e usuários
  - Gerenciamento de chats
  - Proxy para Python AI Service

#### 🐍 **Python AI Service** (Porta 5000)
- **Função**: Motor de IA especializado
- **Stack**: FastAPI, Claude AI, CSS Expert, HTML Optimizer
- **Responsabilidades**:
  - Geração ultra-moderna de emails
  - Processamento inteligente de chat
  - Otimização CSS/HTML avançada
  - Acesso direto ao MongoDB para atualizações

#### 🗄️ **MongoDB** (Porta 27017)
- **Função**: Banco de dados principal
- **Acesso**: Compartilhado entre Node.js e Python
- **Collections**: users, projects, chats, chatmessages

## ✨ Funcionalidades

### 🧠 IA Avançada
- **Geração Ultra-Moderna**: Emails responsivos com design de última geração
- **Chat Inteligente**: Modificações em tempo real via conversação
- **CSS Expert**: Otimização automática para Gmail, Outlook, Apple Mail
- **Validação HTML**: Verificação completa de compatibilidade

### 🎨 Design & Templates
- **5+ Indústrias**: Saúde, Tecnologia, Educação, E-commerce, Finanças
- **6+ Tons**: Professional, Friendly, Urgent, Casual, Formal, Luxury
- **Dark Mode**: Suporte nativo para modo escuro
- **Mobile-First**: Design responsivo otimizado

### 💬 Chat Inteligente
- **Modificações Contextuais**: "Mude as cores para azul profissional"
- **Atualização Instantânea**: Projeto atualizado em tempo real
- **Histórico Completo**: Todas as conversas são salvas
- **Multi-projeto**: Chat específico por projeto

### 🔧 Sistema Robusto
- **Fallback Inteligente**: Sistema continua funcionando mesmo se IA falhar
- **Health Monitoring**: Monitoramento completo de todos os serviços
- **Rate Limiting**: Proteção contra abuso
- **Logs Avançados**: Rastreamento completo de operações

## 🚀 Início Rápido

### Pré-requisitos

- **Node.js** 18+
- **Python** 3.11+
- **MongoDB** 7.0+ (local ou Atlas)
- **Docker** (opcional, mas recomendado)

### ⚡ Setup Automático

```bash
# 1. Clone o repositório
git clone https://github.com/seu-usuario/mailtrendz-backend.git
cd mailtrendz-backend

# 2. Execute o setup automático
chmod +x scripts/setup.sh
./scripts/setup.sh

# 3. Configure suas chaves de API no .env
# OPENROUTER_API_KEY=sua_chave_aqui

# 4. Inicie o ambiente de desenvolvimento
chmod +x scripts/dev.sh
./scripts/dev.sh
```

### 🐳 Setup com Docker (Recomendado)

```bash
# 1. Clone e configure
git clone https://github.com/seu-usuario/mailtrendz-backend.git
cd mailtrendz-backend
cp .env.example .env

# 2. Configure OPENROUTER_API_KEY no .env

# 3. Inicie com Docker
docker-compose up -d

# 4. Verifique os serviços
curl http://localhost:8000/api/v1/health  # Node.js API
curl http://localhost:5000/health         # Python AI Service
```

## ⚙️ Configuração

### Variáveis de Ambiente Essenciais

```bash
# IA - OBRIGATÓRIO
OPENROUTER_API_KEY=sk-or-v1-sua_chave_aqui

# MongoDB
MONGODB_URL=mongodb://localhost:27017/mailtrendz

# Python AI Service
PYTHON_AI_SERVICE_URL=http://localhost:5000

# JWT
JWT_SECRET=seu_jwt_secret_seguro
```

### Configuração Avançada

Veja `.env.example` para todas as opções disponíveis.

## 🛠️ Desenvolvimento

### Estrutura do Projeto

```
mailtrendz-backend/
├── src/                    # Código fonte principal
│   ├── controllers/        # Controllers da API Node.js
│   ├── services/           # Serviços de negócio
│   │   └── ai/            # Cliente Python AI
│   ├── models/            # Modelos MongoDB
│   ├── routes/            # Rotas da API
│   ├── utils/             # Utilitários Node.js
│   ├── ai-service/        # Python AI Service
│   │   ├── app/
│   │   │   ├── services/  # Serviços de IA
│   │   │   ├── database/  # Cliente MongoDB Python
│   │   │   ├── models/    # Modelos Python
│   │   │   └── utils/     # Utilitários Python
│   │   ├── app.py         # FastAPI principal
│   │   └── requirements.txt # Dependências Python
│   ├── app.ts             # Configuração Express
│   └── server.ts          # Entry point Node.js
├── scripts/               # Scripts de desenvolvimento
└── docker-compose.yml    # Configuração Docker
```

### Comandos de Desenvolvimento

```bash
# Node.js API
npm run dev          # Servidor desenvolvimento
npm run build        # Build TypeScript
npm run test         # Executar testes

# Python AI Service
cd src/ai-service
source venv/bin/activate
python app.py        # Servidor desenvolvimento
pytest              # Executar testes

# Docker
docker-compose up -d                    # Iniciar todos os serviços
docker-compose logs -f python-ai       # Ver logs Python AI
docker-compose logs -f nodejs-api      # Ver logs Node.js
```

### Debugging

#### Debug Node.js
```bash
# Terminal 1 - Python AI Service
cd src/ai-service && source venv/bin/activate && python app.py

# Terminal 2 - Node.js com debug
DEBUG=* npm run dev
```

#### Debug Python AI
```bash
# Terminal 1 - Node.js API
npm run dev

# Terminal 2 - Python AI com debug
cd src/ai-service
source venv/bin/activate
uvicorn app:app --host 0.0.0.0 --port 5000 --reload --log-level debug
```

## 📡 API

### Endpoints Principais

#### Node.js API (http://localhost:8000)

```bash
# Autenticação
POST /api/v1/auth/register    # Registrar usuário
POST /api/v1/auth/login       # Login

# Projetos
GET  /api/v1/projects         # Listar projetos
POST /api/v1/projects         # Criar projeto

# Chat
GET  /api/v1/chats/project/:id # Chat do projeto
POST /api/v1/chats/:id/messages # Enviar mensagem

# IA (proxy para Python)
POST /api/v1/ai/generate      # Gerar email
POST /api/v1/ai/improve       # Melhorar email
POST /api/v1/ai/chat          # Chat com IA
```

#### Python AI Service (http://localhost:5000)

```bash
# IA
POST /generate               # Geração de email
POST /modify                 # Modificação de email
POST /chat/process           # Processamento de chat

# Utilitários
POST /optimize-css           # Otimização CSS
POST /validate              # Validação HTML
GET  /health                # Health check
```

### Documentação Interativa

- **Node.js API**: http://localhost:8000/docs
- **Python AI Service**: http://localhost:5000/docs

## 🧪 Testes

### Testes Automatizados

```bash
# Node.js
npm test                     # Todos os testes
npm run test:watch          # Modo watch
npm run test:coverage       # Com coverage

# Python
cd src/ai-service
source venv/bin/activate
pytest                      # Todos os testes
pytest --cov=app           # Com coverage
```

### Testes Manuais

```bash
# Testar conectividade
curl http://localhost:8000/api/v1/health
curl http://localhost:5000/health

# Testar geração de email
curl -X POST http://localhost:5000/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Crie um email sobre tecnologia",
    "industry": "tecnologia",
    "tone": "professional"
  }'
```

## 🐳 Docker

### Desenvolvimento

```bash
# Iniciar todos os serviços
docker-compose up -d

# Ver logs
docker-compose logs -f

# Parar serviços
docker-compose down

# Rebuild
docker-compose up --build
```

### Produção

```bash
# Com perfis específicos
docker-compose --profile production up -d

# Com cache Redis
docker-compose --profile cache --profile production up -d
```

### Comandos Úteis

```bash
# Acessar container
docker-compose exec nodejs-api sh
docker-compose exec python-ai sh

# Ver status
docker-compose ps

# Limpar volumes
docker-compose down -v
```

## 🚢 Deploy

### Preparação

1. **Configure variáveis de ambiente de produção**
2. **Configure MongoDB Atlas ou MongoDB dedicado**
3. **Obtenha chave OPENROUTER_API_KEY**
4. **Configure domínios e SSL**

### Deploy Render.com

```bash
# 1. Conecte repositório ao Render
# 2. Configure variáveis de ambiente
# 3. Use docker-compose.yml para deploy
```

### Deploy AWS/GCP

```bash
# 1. Use docker-compose para container orchestration
# 2. Configure load balancer
# 3. Configure auto-scaling
```

## 🔧 Troubleshooting

### Problemas Comuns

#### Python AI Service não conecta
```bash
# Verificar se está rodando
curl http://localhost:5000/health

# Ver logs
docker-compose logs python-ai

# Restart
docker-compose restart python-ai
```

#### MongoDB não conecta
```bash
# Verificar conexão
mongosh "mongodb://localhost:27017/mailtrendz"

# Ver logs MongoDB
docker-compose logs mongodb
```

#### Rate Limit atingido
```bash
# Verificar configuração
grep RATE_LIMIT .env

# Ajustar limites temporariamente
# Editar RATE_LIMIT_MAX_REQUESTS no .env
```

## 🤝 Contribuição

### Como Contribuir

1. **Fork o projeto**
2. **Crie uma branch para sua feature** (`git checkout -b feature/AmazingFeature`)
3. **Commit suas mudanças** (`git commit -m 'Add some AmazingFeature'`)
4. **Push para a branch** (`git push origin feature/AmazingFeature`)
5. **Abra um Pull Request**

### Padrões de Código

- **Node.js**: ESLint + Prettier
- **Python**: Black + Flake8
- **Commits**: Conventional Commits
- **Testes**: Obrigatórios para novas features

### Estrutura de Branch

- `main`: Produção
- `develop`: Desenvolvimento
- `feature/*`: Novas funcionalidades
- `bugfix/*`: Correções
- `hotfix/*`: Correções urgentes

## 📞 Suporte

### Canais de Suporte

- **Issues**: Para bugs e requests
- **Discussions**: Para dúvidas gerais
- **Email**: suporte@mailtrendz.com

### Links Úteis

- **Documentação**: https://docs.mailtrendz.com
- **Status Page**: https://status.mailtrendz.com
- **Changelog**: CHANGELOG.md

---

## 📄 Licença

Este projeto está licenciado sob a Licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.

## 🙏 Agradecimentos

- **OpenRouter** pela API de IA
- **FastAPI** pelo framework Python
- **Express.js** pelo framework Node.js
- **MongoDB** pelo banco de dados
- **Docker** pela containerização

---

<div align="center">

**✨ Desenvolvido com ❤️ para revolucionar o email marketing ✨**

[Website](https://mailtrendz.com) • [Documentação](https://docs.mailtrendz.com) • [Demo](https://demo.mailtrendz.com)

</div>
