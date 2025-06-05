# Use Node.js 18 Alpine para menor tamanho
FROM node:18-alpine

# Definir diretório de trabalho
WORKDIR /app

# Instalar dependências do sistema
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    && ln -sf python3 /usr/bin/python

# Copiar arquivos de dependências
COPY package*.json ./
COPY tsconfig.json ./

# Instalar dependências
RUN npm ci --only=production && npm cache clean --force

# Copiar código fonte
COPY src/ ./src/

# Build da aplicação
RUN npm run build

# Criar usuário não-root para segurança
RUN addgroup -g 1001 -S nodejs
RUN adduser -S mailtrendz -u 1001

# Criar diretório de logs
RUN mkdir -p logs && chown -R mailtrendz:nodejs logs

# Trocar para usuário não-root
USER mailtrendz

# Expor porta
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); http.get('http://localhost:8000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# Comando para iniciar a aplicação
CMD ["npm", "run", "start:prod"]