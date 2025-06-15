# ✅ DOCKERFILE OTIMIZADO PARA RAILWAY
FROM python:3.11-slim

# Otimizações para Railway
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV PORT=5000

WORKDIR /app

# Instalar apenas o essencial
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar aplicação
COPY . .

# Criar logs directory
RUN mkdir -p logs

# Health check simples
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD python -c "import requests; requests.get('http://localhost:5000/health', timeout=5)"

# Expor porta
EXPOSE 5000

# Comando otimizado
CMD ["python", "app_simple.py"]