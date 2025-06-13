# ✅ DOCKERFILE PYTHON AI SERVICE - VERSÃO SIMPLIFICADA
# Microserviço Python otimizado para Railway

FROM python:3.11-slim

# Metadata
LABEL maintainer="MailTrendz Team"
LABEL version="2.0.0-simple"
LABEL description="Python AI Service for MailTrendz - Simplified"

# Configurar variáveis de ambiente
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV PIP_NO_CACHE_DIR=1
ENV PIP_DISABLE_PIP_VERSION_CHECK=1
ENV PORT=5000

# Instalar dependências mínimas
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Criar usuário não-root
RUN useradd --create-home --shell /bin/bash app

# Criar diretório da aplicação
WORKDIR /app

# Copiar requirements
COPY requirements.txt .

# Instalar dependências Python
RUN pip install --no-cache-dir -r requirements.txt

# Copiar TODOS os arquivos Python
COPY app/ ./app/
COPY app.py .
COPY app_simple.py .

# Criar diretórios necessários
RUN mkdir -p logs && \
    chown -R app:app /app

# Mudar para usuário não-root
USER app

# Expor porta
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:5000/health || exit 1

# Comando usando app_simple.py
CMD ["python", "app_simple.py"]
