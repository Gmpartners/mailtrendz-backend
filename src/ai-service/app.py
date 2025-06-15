"""
✅ MICROSERVIÇO PYTHON DE IA - MAILTRENDZ
FastAPI + Claude + CSS Expert + HTML Optimizer + MongoDB
"""

import os
import sys
import asyncio
import uvicorn
from datetime import datetime
import logging
from loguru import logger

# Configurar loguru para produção
logger.remove()  # Remove handler padrão
logger.add(sys.stdout, level="INFO", format="{time:YYYY-MM-DD HH:mm:ss} | {level} | {message}")

try:
    from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
    from fastapi.middleware.cors import CORSMiddleware
    from fastapi.responses import JSONResponse
    from pydantic import BaseModel, Field
    from typing import Dict, List, Optional, Any
    
    logger.info("✅ FastAPI imports successful")
except ImportError as e:
    logger.error(f"❌ FastAPI import failed: {e}")
    sys.exit(1)

# Configuração da aplicação
app = FastAPI(
    title="MailTrendz AI Service",
    description="Microserviço Python para geração ultra-moderna de emails com IA",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Em produção, especificar domínios
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ================================
# HEALTH CHECK SIMPLES PRIMEIRO
# ================================

@app.get("/")
async def root():
    """Endpoint raiz com informações do serviço"""
    return {
        "service": "MailTrendz AI Service",
        "version": "2.0.0",
        "status": "operational",
        "timestamp": datetime.now().isoformat(),
        "environment": os.getenv("NODE_ENV", "development"),
        "mongodb_configured": bool(os.getenv("MONGODB_URL") or os.getenv("MONGODB_URI")),
        "openrouter_configured": bool(os.getenv("OPENROUTER_API_KEY"))
    }

@app.get("/health")
async def health_check():
    """Health check básico que sempre responde"""
    try:
        # Health check básico sempre funcional
        basic_health = {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "version": "2.0.0",
            "service": "python-ai-service",
            "environment": os.getenv("NODE_ENV", "development"),
            "port": os.getenv("PORT", "5000"),
            "python_version": f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}"
        }
        
        # Verificar configurações essenciais
        config_status = {
            "mongodb_url": bool(os.getenv("MONGODB_URL") or os.getenv("MONGODB_URI")),
            "openrouter_key": bool(os.getenv("OPENROUTER_API_KEY")),
            "port_configured": bool(os.getenv("PORT"))
        }
        
        basic_health["configuration"] = config_status
        
        # Se todas as configs estão OK, tentar verificações mais profundas
        if all(config_status.values()):
            try:
                # Verificar se consegue importar modules locais
                from app.database.mongodb_client import mongodb_client
                basic_health["mongodb_client"] = "imported"
                
                # Tentar verificar MongoDB (mas não falhar se não conseguir)
                try:
                    mongo_health = await mongodb_client.health_check()
                    basic_health["mongodb"] = {
                        "status": mongo_health.get("status", "unknown"),
                        "configured": mongo_health.get("mongodb_url_configured", False)
                    }
                except Exception as mongo_error:
                    basic_health["mongodb"] = {
                        "status": "error",
                        "error": str(mongo_error)[:100]  # Limitar tamanho do erro
                    }
                    
            except ImportError as import_error:
                basic_health["import_status"] = f"error: {str(import_error)[:100]}"
        
        return basic_health
        
    except Exception as e:
        # Mesmo se tudo falhar, retornar status básico
        logger.error(f"❌ Health check error: {e}")
        return {
            "status": "degraded",
            "timestamp": datetime.now().isoformat(),
            "error": str(e)[:200],
            "service": "python-ai-service",
            "version": "2.0.0"
        }

# ================================
# TENTATIVA DE IMPORTAR SERVIÇOS
# ================================

# Variáveis globais para serviços
email_generator = None
css_expert = None
html_optimizer = None
ai_coordinator = None
email_validator = None
performance_monitor = None
mongodb_client = None

# Flag para indicar se serviços estão carregados
services_loaded = False

async def load_services():
    """Carrega serviços de forma assíncrona"""
    global services_loaded, email_generator, css_expert, html_optimizer
    global ai_coordinator, email_validator, performance_monitor, mongodb_client
    
    try:
        logger.info("🔄 Carregando serviços...")
        
        # Importar serviços locais
        from app.services.email_generator import EmailGenerator
        from app.services.css_expert import CSSExpert
        from app.services.html_optimizer import HTMLOptimizer
        from app.services.ai_coordinator import AICoordinator
        from app.utils.validators import EmailValidator
        from app.utils.performance import PerformanceMonitor
        from app.database.mongodb_client import mongodb_client as mongo_client, init_mongodb
        
        logger.info("✅ Imports de serviços successful")
        
        # Instanciar serviços
        email_generator = EmailGenerator()
        css_expert = CSSExpert()
        html_optimizer = HTMLOptimizer()
        ai_coordinator = AICoordinator()
        email_validator = EmailValidator()
        performance_monitor = PerformanceMonitor()
        mongodb_client = mongo_client
        
        logger.info("✅ Serviços instanciados")
        
        # Conectar ao MongoDB (não crítico se falhar)
        try:
            mongo_connected = await init_mongodb()
            if mongo_connected:
                logger.info("✅ MongoDB conectado")
            else:
                logger.warning("⚠️ MongoDB não conectado - modo offline")
        except Exception as mongo_error:
            logger.warning(f"⚠️ MongoDB connection failed: {mongo_error}")
        
        # Testar serviços (não crítico se falhar)
        try:
            ai_health = await ai_coordinator.health_check()
            logger.info(f"🤖 IA Status: {'✅ OK' if ai_health else '⚠️ Degraded'}")
        except Exception as ai_error:
            logger.warning(f"⚠️ AI service check failed: {ai_error}")
        
        services_loaded = True
        logger.info("🎉 Todos os serviços carregados com sucesso!")
        
    except Exception as e:
        logger.error(f"❌ Erro ao carregar serviços: {e}")
        services_loaded = False

# Modelos Pydantic básicos (sempre disponíveis)
class EmailGenerationRequest(BaseModel):
    prompt: str = Field(..., min_length=5, max_length=2000)
    context: Dict[str, Any] = Field(default_factory=dict)
    style_preferences: Optional[Dict[str, str]] = Field(default=None)
    industry: str = Field(default="geral")
    tone: str = Field(default="professional")
    urgency: str = Field(default="medium")

class EmailResponse(BaseModel):
    success: bool
    data: Dict[str, Any]
    metadata: Dict[str, Any]
    processing_time: float
    timestamp: datetime

# ================================
# ROTAS CONDICIONAIS
# ================================

@app.post("/generate")
async def generate_email_endpoint(request: EmailGenerationRequest):
    """Geração de email (depende dos serviços)"""
    if not services_loaded or not ai_coordinator:
        return JSONResponse(
            status_code=503,
            content={
                "success": False,
                "error": "Serviços ainda não carregados ou indisponíveis",
                "service_status": "loading"
            }
        )
    
    try:
        start_time = datetime.now()
        
        logger.info(f"🎯 Gerando email - Prompt: {request.prompt[:50]}...")
        
        # Coordenar geração com todos os serviços
        result = await ai_coordinator.generate_ultra_modern_email(
            prompt=request.prompt,
            context=request.context,
            style_preferences=request.style_preferences,
            industry=request.industry,
            tone=request.tone,
            urgency=request.urgency
        )
        
        processing_time = (datetime.now() - start_time).total_seconds()
        
        logger.info(f"✅ Email gerado - {processing_time:.3f}s")
        
        return {
            "success": True,
            "data": result,
            "metadata": {
                "processing_time": processing_time,
                "service": "python-ai-service",
                "version": "2.0.0"
            },
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"❌ Erro na geração: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": str(e),
                "service": "python-ai-service"
            }
        )

@app.get("/status")
async def get_status():
    """Status detalhado dos serviços"""
    return {
        "services_loaded": services_loaded,
        "available_services": {
            "email_generator": email_generator is not None,
            "css_expert": css_expert is not None,
            "html_optimizer": html_optimizer is not None,
            "ai_coordinator": ai_coordinator is not None,
            "email_validator": email_validator is not None,
            "performance_monitor": performance_monitor is not None,
            "mongodb_client": mongodb_client is not None
        },
        "configuration": {
            "mongodb_url": bool(os.getenv("MONGODB_URL") or os.getenv("MONGODB_URI")),
            "openrouter_key": bool(os.getenv("OPENROUTER_API_KEY")),
            "port": os.getenv("PORT", "5000"),
            "environment": os.getenv("NODE_ENV", "development")
        },
        "timestamp": datetime.now().isoformat()
    }

# ================================
# EVENTOS DE STARTUP
# ================================

@app.on_event("startup")
async def startup_event():
    """Inicialização do serviço"""
    logger.info("🚀 Iniciando MailTrendz AI Service...")
    
    # Carregar serviços em background para não bloquear o startup
    asyncio.create_task(load_services())
    
    logger.info("🎉 MailTrendz AI Service iniciado (serviços carregando em background)")

@app.on_event("shutdown")
async def shutdown_event():
    """Finalização do serviço"""
    logger.info("🛑 Finalizando MailTrendz AI Service...")
    
    # Fechar conexões se disponíveis
    if mongodb_client:
        try:
            await mongodb_client.disconnect()
        except:
            pass
    
    if performance_monitor:
        try:
            performance_monitor.stop_monitoring()
        except:
            pass
    
    logger.info("👋 MailTrendz AI Service finalizado")

# ================================
# CONFIGURAÇÃO PARA RAILWAY
# ================================

if __name__ == "__main__":
    # Configurações para Railway
    port = int(os.getenv("PORT", 5000))
    host = "0.0.0.0"
    
    logger.info(f"🚀 Iniciando servidor na porta {port}")
    
    # Configuração otimizada para produção
    uvicorn.run(
        "app:app",
        host=host,
        port=port,
        reload=False,  # Desabilitado para produção
        log_level="info",
        access_log=True
    )