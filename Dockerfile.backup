# MailTrendz Backend - Production Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Instalar dependências de build
RUN apk add --no-cache python3 make g++

# Copiar package files
COPY package*.json ./
COPY tsconfig*.json ./

# Instalar dependências
RUN npm ci --only=production

# Copiar código fonte
COPY src/ ./src/

# Build TypeScript
RUN npm run build

# ===== Estágio de produção =====
FROM node:18-alpine AS production

WORKDIR /app

# Instalar dependências do sistema
RUN apk add --no-cache \
    python3 \
    py3-pip \
    curl \
    && rm -rf /var/cache/apk/*

# Criar usuário não-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Copiar node_modules do builder
COPY --from=builder /app/node_modules ./node_modules

# Copiar código compilado
COPY --from=builder /app/dist ./dist
COPY package*.json ./

# Copiar Python AI Service
COPY src/ai-service ./src/ai-service

# Instalar dependências Python
RUN cd src/ai-service && \
    pip3 install --no-cache-dir -r requirements.txt

# Criar diretórios necessários
RUN mkdir -p logs && \
    chown -R nextjs:nodejs /app

# Mudar para usuário não-root
USER nextjs

# Variáveis de ambiente
ENV NODE_ENV=production
ENV PORT=8000
ENV PYTHON_AI_PORT=5000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Expor portas
EXPOSE 8000 5000

# Script de inicialização
COPY docker-entrypoint.sh /docker-entrypoint.sh
USER root
RUN chmod +x /docker-entrypoint.sh
USER nextjs

ENTRYPOINT ["/docker-entrypoint.sh"]