# IA Enhanced - MailTrendz

## Visão Geral

A IA Enhanced (Inteligente) é uma evolução do sistema de IA do MailTrendz que adiciona capacidades avançadas de análise e geração de emails.

## Funcionalidades

### 1. Análise Inteligente de Prompts
- Detecção automática de intenções (criar, modificar, melhorar, redesenhar)
- Extração de requisitos visuais (cores, layout, tipografia)
- Identificação de requisitos de conteúdo (tom, urgência, foco)
- Cálculo de confiança da análise

### 2. Geração Contextual
- Prompts melhorados baseados na análise
- Aplicação automática de requisitos detectados
- Sugestões inteligentes baseadas no contexto

### 3. Chat Inteligente
- Detecção automática de quando atualizar o email
- Análise em tempo real das mensagens
- Sugestões contextuais

## Endpoints da API

### Status do Sistema
```
GET /api/v1/ai/enhanced/status
```

### Análise de Prompt
```
POST /api/v1/ai/enhanced/analyze
{
  "prompt": "string",
  "projectContext": {
    "type": "string",
    "industry": "string",
    "tone": "string"
  }
}
```

### Geração Inteligente
```
POST /api/v1/ai/enhanced/generate
{
  "prompt": "string",
  "projectContext": {...},
  "useEnhanced": true
}
```

### Chat Inteligente
```
POST /api/v1/ai/enhanced/chat
{
  "message": "string",
  "chatHistory": [...],
  "projectContext": {...}
}
```

### Comparação de Modos
```
POST /api/v1/ai/enhanced/compare
{
  "prompt": "string",
  "projectContext": {...}
}
```

## Configuração

### Variáveis de Ambiente
```env
# Forçar uso do modo Enhanced (desenvolvimento)
FORCE_ENHANCED_MODE=true
```

## Arquitetura

```
src/
├── controllers/
│   └── enhanced-ai.controller.ts    # Controller principal
├── routes/
│   └── enhanced-ai.routes.ts        # Definição de rotas
├── services/
│   └── ai/
│       ├── enhanced/
│       │   └── EnhancedAIService.ts # Serviço principal
│       └── analyzers/
│           └── SmartPromptAnalyzer.ts # Analisador de prompts
└── types/
    └── enhanced-ai.types.ts         # Tipos TypeScript

```

## Exemplos de Uso

### Prompt Simples
```
"Crie um email de boas-vindas"
```

### Prompt com Detecção Visual
```
"Email promocional com botão azul e layout moderno"
```

### Prompt com Múltiplas Intenções
```
"Melhore o título adicionando urgência e mude as cores para vermelho"
```

## Frontend

No frontend, ative o toggle "IA Inteligente" no chat para usar o modo Enhanced.

## Fallback

Se o serviço Enhanced falhar, o sistema automaticamente volta para a IA básica.
