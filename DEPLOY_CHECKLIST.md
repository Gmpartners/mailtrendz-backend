# 🚀 CHECKLIST DE DEPLOY - MAILTRENDZ v2.1

## ✅ PRÉ-DEPLOY
- [ ] Sistema reestruturado confirmado
- [ ] Build sem erros críticos
- [ ] Variáveis de ambiente preparadas
- [ ] MongoDB Atlas funcionando

## 🐍 PYTHON AI SERVICE (Railway)
- [ ] Conta Railway criada
- [ ] Projeto conectado ao GitHub
- [ ] Pasta src/ai-service selecionada
- [ ] Environment variables configuradas:
  - [ ] OPENROUTER_API_KEY
  - [ ] MONGODB_URL
  - [ ] FRONTEND_URL
  - [ ] PORT=5000
- [ ] Deploy realizado com sucesso
- [ ] Health check funcionando: /health
- [ ] URL copiada para próximo passo

## 🌐 NODE.JS BACKEND (Vercel)
- [ ] Variáveis atualizadas no Vercel:
  - [ ] NODE_ENV=production
  - [ ] LOG_LEVEL=info
  - [ ] FRONTEND_URL=https://seu-frontend.vercel.app
  - [ ] PYTHON_AI_SERVICE_URL=https://seu-python-ai.railway.app
- [ ] Deploy realizado: npx vercel --prod
- [ ] Health check funcionando: /health

## 🗄️ BANCO DE DADOS
- [ ] MongoDB Atlas acessível
- [ ] Migração executada (se necessário)
- [ ] Collections criadas corretamente

## 🔍 VALIDAÇÃO PÓS-DEPLOY
- [ ] Backend respondendo: https://seu-projeto.vercel.app/health
- [ ] Python AI respondendo: https://seu-python-ai.railway.app/health
- [ ] API endpoints funcionando
- [ ] Sistema de chat operacional
- [ ] Geração de emails funcionando

## 📊 MONITORAMENTO
- [ ] Logs Vercel monitorados
- [ ] Logs Railway verificados
- [ ] Performance aceitável (<2s response time)
- [ ] Erros minimizados

## 🎯 PONTO DE ATENÇÃO
⚠️ O Python AI Service é OBRIGATÓRIO para o sistema funcionar!
Sem ele, o chat e geração de emails não funcionarão.

## 🚨 TROUBLESHOOTING
Se algo não funcionar:
1. Verificar logs no Vercel e Railway
2. Confirmar todas as env vars
3. Testar health checks individualmente
4. Validar conectividade entre serviços