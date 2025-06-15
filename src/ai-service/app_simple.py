"""
✅ VERSÃO ULTRA-SIMPLES PARA RAILWAY
FastAPI básico que sempre funciona
"""

import os
import sys
from datetime import datetime

print("🚀 [STARTUP] Iniciando MailTrendz AI Service...")

try:
    from fastapi import FastAPI
    from fastapi.middleware.cors import CORSMiddleware
    print("✅ [STARTUP] FastAPI imports OK")
except ImportError as e:
    print(f"❌ [STARTUP] FastAPI import failed: {e}")
    sys.exit(1)

# Criar app
app = FastAPI(
    title="MailTrendz AI Service", 
    version="2.0.0-ultra-simple"
)

# CORS básico
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

print("✅ [STARTUP] FastAPI app criado")

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "MailTrendz AI Service",
        "version": "2.0.0-ultra-simple",
        "status": "operational",
        "timestamp": datetime.now().isoformat(),
        "message": "🚀 Ultra-simple Python AI Service funcionando!",
        "port": os.getenv("PORT", "5000"),
        "environment": os.getenv("NODE_ENV", "development")
    }

@app.get("/health")
async def health():
    """Health check ultra-simples"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "2.0.0-ultra-simple",
        "service": "python-ai-ultra-simple",
        "port": os.getenv("PORT", "5000"),
        "python_version": f"{sys.version_info.major}.{sys.version_info.minor}"
    }

@app.get("/test")
async def test():
    """Endpoint de teste"""
    return {
        "test": "OK",
        "timestamp": datetime.now().isoformat(),
        "environment_vars": {
            "PORT": os.getenv("PORT"),
            "NODE_ENV": os.getenv("NODE_ENV"),
            "MONGODB_URI": "***" if os.getenv("MONGODB_URI") else None,
            "OPENROUTER_API_KEY": "***" if os.getenv("OPENROUTER_API_KEY") else None
        }
    }

print("✅ [STARTUP] Rotas configuradas")

if __name__ == "__main__":
    print("🚀 [STARTUP] Iniciando uvicorn...")
    
    import uvicorn
    
    port = int(os.getenv("PORT", 5000))
    
    print(f"✅ [STARTUP] Porta configurada: {port}")
    print(f"✅ [STARTUP] Variáveis de ambiente:")
    print(f"   PORT: {os.getenv('PORT')}")
    print(f"   NODE_ENV: {os.getenv('NODE_ENV')}")
    print(f"   MONGODB_URI: {'✅ Configurado' if os.getenv('MONGODB_URI') else '❌ Não configurado'}")
    print(f"   OPENROUTER_API_KEY: {'✅ Configurado' if os.getenv('OPENROUTER_API_KEY') else '❌ Não configurado'}")
    
    try:
        uvicorn.run(
            "app_simple:app",
            host="0.0.0.0",
            port=port,
            log_level="info",
            access_log=True
        )
    except Exception as e:
        print(f"❌ [STARTUP] Erro ao iniciar uvicorn: {e}")
        sys.exit(1)