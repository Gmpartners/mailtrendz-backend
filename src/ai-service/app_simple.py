"""
🚀 MAILTRENDZ AI SERVICE - VERSÃO SIMPLIFICADA PARA RAILWAY
FastAPI básico para testar deploy
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os
from datetime import datetime

# Configuração básica
app = FastAPI(
    title="MailTrendz AI Service",
    description="Microserviço Python para IA de emails",
    version="2.0.0-simple",
    docs_url="/docs"
)

# CORS básico
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    """Endpoint raiz"""
    return {
        "service": "MailTrendz AI Service",
        "version": "2.0.0-simple",
        "status": "operational",
        "timestamp": datetime.now(),
        "message": "🚀 Python AI Service rodando no Railway!"
    }

@app.get("/health")
async def health_check():
    """Health check básico"""
    return {
        "status": "healthy",
        "timestamp": datetime.now(),
        "version": "2.0.0-simple",
        "python_version": "3.11",
        "environment": os.getenv("NODE_ENV", "production"),
        "port": os.getenv("PORT", "5000")
    }

@app.post("/test")
async def test_endpoint():
    """Teste básico de POST"""
    return {
        "success": True,
        "message": "POST endpoint funcionando!",
        "timestamp": datetime.now()
    }

if __name__ == "__main__":
    # Configuração para produção no Railway
    port = int(os.getenv("PORT", 5000))
    uvicorn.run(
        "app_simple:app",
        host="0.0.0.0",
        port=port,
        log_level="info"
    )
