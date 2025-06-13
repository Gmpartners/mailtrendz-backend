"""
✅ MICROSERVIÇO PYTHON DE IA - MAILTRENDZ
FastAPI + Claude + CSS Expert + HTML Optimizer + MongoDB
"""

from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Any
import asyncio
import uvicorn
import os
from datetime import datetime
import logging
from loguru import logger

# Importar serviços locais
from app.services.email_generator import EmailGenerator
from app.services.css_expert import CSSExpert
from app.services.html_optimizer import HTMLOptimizer
from app.services.ai_coordinator import AICoordinator
from app.utils.validators import EmailValidator
from app.utils.performance import PerformanceMonitor
from app.database.mongodb_client import mongodb_client, init_mongodb, close_mongodb
from app.models.project_models import (
    Project, Chat, ChatMessage, ProjectContext,
    AIProcessingRequest, AIProcessingResponse,
    EmailGenerationRequest, EmailModificationRequest
)

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

# Modelos Pydantic atualizados
class EmailGenerationRequest(BaseModel):
    prompt: str = Field(..., min_length=5, max_length=2000, description="Prompt para geração do email")
    context: Dict[str, Any] = Field(default_factory=dict, description="Contexto do projeto")
    style_preferences: Optional[Dict[str, str]] = Field(default=None, description="Preferências de estilo")
    industry: str = Field(default="geral", description="Indústria do negócio")
    tone: str = Field(default="professional", description="Tom do email")
    urgency: str = Field(default="medium", description="Nível de urgência")

class EmailModificationRequest(BaseModel):
    project_id: str = Field(..., description="ID do projeto")
    user_id: str = Field(..., description="ID do usuário")
    instructions: str = Field(..., min_length=3, description="Instruções de modificação")
    preserve_structure: bool = Field(default=True, description="Preservar estrutura HTML")

class CSSOptimizationRequest(BaseModel):
    html: str = Field(..., description="HTML para otimização")
    target_clients: List[str] = Field(default=["gmail", "outlook"], description="Clientes de email alvo")
    enable_dark_mode: bool = Field(default=True, description="Habilitar suporte a dark mode")
    mobile_first: bool = Field(default=True, description="Design mobile-first")

class ChatProcessingRequest(BaseModel):
    message: str = Field(..., description="Mensagem do usuário")
    chat_id: str = Field(..., description="ID do chat")
    user_id: str = Field(..., description="ID do usuário")
    project_id: Optional[str] = Field(None, description="ID do projeto")

class EmailResponse(BaseModel):
    success: bool
    data: Dict[str, Any]
    metadata: Dict[str, Any]
    processing_time: float
    timestamp: datetime

# Instanciar serviços
email_generator = EmailGenerator()
css_expert = CSSExpert()
html_optimizer = HTMLOptimizer()
ai_coordinator = AICoordinator()
email_validator = EmailValidator()
performance_monitor = PerformanceMonitor()

# Eventos de startup e shutdown
@app.on_event("startup")
async def startup_event():
    """Inicialização do serviço"""
    logger.info("🚀 Iniciando MailTrendz AI Service...")
    
    # Conectar ao MongoDB
    mongo_connected = await init_mongodb()
    if mongo_connected:
        logger.success("✅ MongoDB conectado com sucesso")
    else:
        logger.warning("⚠️ MongoDB não conectado - modo offline")
    
    # Testar serviços
    ai_health = await ai_coordinator.health_check()
    logger.info(f"🤖 IA Status: {'✅ OK' if ai_health else '❌ Indisponível'}")
    
    logger.success("🎉 MailTrendz AI Service iniciado com sucesso!")

@app.on_event("shutdown")
async def shutdown_event():
    """Finalização do serviço"""
    logger.info("🛑 Finalizando MailTrendz AI Service...")
    
    # Fechar conexões
    await close_mongodb()
    performance_monitor.stop_monitoring()
    
    logger.info("👋 MailTrendz AI Service finalizado")

# Middleware de logging e performance
@app.middleware("http")
async def log_requests(request, call_next):
    start_time = datetime.now()
    
    # Iniciar monitoramento
    request_id = performance_monitor.start_request(
        request_type=f"{request.method} {request.url.path}",
        details={"url": str(request.url), "method": request.method}
    )
    
    # Log da requisição
    logger.info(f"🔄 [{request.method}] {request.url.path} - Início (ID: {request_id})")
    
    try:
        response = await call_next(request)
        
        # Calcular tempo de processamento
        process_time = (datetime.now() - start_time).total_seconds()
        
        # Finalizar monitoramento
        performance_monitor.finish_request(
            request_id=request_id,
            success=response.status_code < 400,
            metrics={"response_size": len(response.body) if hasattr(response, 'body') else 0}
        )
        
        # Log da resposta
        status_icon = "✅" if response.status_code < 400 else "❌"
        logger.info(f"{status_icon} [{request.method}] {request.url.path} - {response.status_code} ({process_time:.3f}s)")
        
        # Adicionar headers de performance
        response.headers["X-Process-Time"] = str(process_time)
        response.headers["X-Request-ID"] = request_id
        
        return response
        
    except Exception as e:
        process_time = (datetime.now() - start_time).total_seconds()
        
        # Finalizar monitoramento com erro
        performance_monitor.finish_request(
            request_id=request_id,
            success=False,
            error_message=str(e)
        )
        
        logger.error(f"❌ [{request.method}] {request.url.path} - Erro: {e} ({process_time:.3f}s)")
        raise

# Rotas principais
@app.get("/")
async def root():
    """Endpoint raiz com informações do serviço"""
    return {
        "service": "MailTrendz AI Service",
        "version": "2.0.0",
        "status": "operational",
        "features": [
            "ultra-modern-email-generation",
            "advanced-css-optimization", 
            "html-validation",
            "multi-client-compatibility",
            "dark-mode-support",
            "mobile-responsive-design",
            "mongodb-integration",
            "real-time-project-updates"
        ],
        "endpoints": {
            "generate": "/generate",
            "modify": "/modify", 
            "optimize-css": "/optimize-css",
            "validate": "/validate",
            "chat": "/chat/process",
            "health": "/health"
        },
        "timestamp": datetime.now(),
        "uptime": performance_monitor.get_uptime()
    }

@app.get("/health")
async def health_check():
    """Health check detalhado do serviço"""
    try:
        # Verificar serviços
        ai_status = await ai_coordinator.health_check()
        css_status = css_expert.health_check()
        html_status = html_optimizer.health_check()
        
        # Verificar MongoDB
        mongo_health = await mongodb_client.health_check()
        mongo_status = mongo_health.get("status") == "connected"
        
        overall_status = "healthy" if all([ai_status, css_status, html_status, mongo_status]) else "degraded"
        
        # Obter métricas de performance
        performance_summary = performance_monitor.get_performance_summary()
        health_status = performance_monitor.get_health_status()
        
        return {
            "status": overall_status,
            "timestamp": datetime.now(),
            "services": {
                "ai_coordinator": "healthy" if ai_status else "unhealthy",
                "css_expert": "healthy" if css_status else "unhealthy", 
                "html_optimizer": "healthy" if html_status else "unhealthy",
                "mongodb": "healthy" if mongo_status else "unhealthy"
            },
            "mongodb": mongo_health,
            "performance": performance_summary,
            "health_metrics": health_status,
            "version": "2.0.0",
            "uptime": performance_monitor.get_uptime()
        }
    except Exception as e:
        logger.error(f"❌ Health check failed: {e}")
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "error": str(e),
                "timestamp": datetime.now()
            }
        )

@app.post("/generate", response_model=EmailResponse)
async def generate_email(request: EmailGenerationRequest):
    """
    ✅ ENDPOINT PRINCIPAL: Geração de Email Ultra-Moderno
    """
    start_time = datetime.now()
    
    try:
        logger.info(f"🎯 Gerando email ultra-moderno - Prompt: {request.prompt[:50]}...")
        
        # Validar entrada
        if not request.prompt.strip():
            raise HTTPException(status_code=400, detail="Prompt não pode estar vazio")
        
        # Coordenar geração com todos os serviços
        result = await ai_coordinator.generate_ultra_modern_email(
            prompt=request.prompt,
            context=request.context,
            style_preferences=request.style_preferences,
            industry=request.industry,
            tone=request.tone,
            urgency=request.urgency
        )
        
        # Otimizar CSS
        optimized_result = await css_expert.optimize_for_email_clients(
            html=result["html"],
            enable_dark_mode=True,
            mobile_first=True
        )
        
        # Validar HTML final
        validation = email_validator.validate_email_html(optimized_result["html"])
        
        processing_time = (datetime.now() - start_time).total_seconds()
        
        response_data = {
            "subject": result["subject"],
            "preview_text": result["preview_text"], 
            "html": optimized_result["html"],
            "text": result["text"],
            "css": optimized_result["css"],
            "components": optimized_result["components"]
        }
        
        metadata = {
            "ai_model": result["metadata"]["model"],
            "processing_time": processing_time,
            "quality_score": result["metadata"]["quality_score"],
            "compatibility_score": optimized_result["compatibility_score"],
            "validation": validation,
            "features_applied": result["metadata"]["features_applied"],
            "css_optimizations": optimized_result["optimizations"],
            "version": "2.0.0-python"
        }
        
        logger.success(f"✅ Email gerado com sucesso - {processing_time:.3f}s")
        
        return EmailResponse(
            success=True,
            data=response_data,
            metadata=metadata,
            processing_time=processing_time,
            timestamp=datetime.now()
        )
        
    except Exception as e:
        processing_time = (datetime.now() - start_time).total_seconds()
        logger.error(f"❌ Erro na geração: {e}")
        
        raise HTTPException(
            status_code=500,
            detail={
                "error": str(e),
                "processing_time": processing_time,
                "timestamp": datetime.now()
            }
        )

@app.post("/modify", response_model=EmailResponse)
async def modify_email(request: EmailModificationRequest):
    """
    ✅ ENDPOINT: Modificação Inteligente de Email COM MONGODB
    """
    start_time = datetime.now()
    
    try:
        logger.info(f"🔧 Modificando email - Projeto: {request.project_id}")
        
        # Buscar projeto no MongoDB
        project_data = await mongodb_client.get_project_with_chat(
            project_id=request.project_id,
            user_id=request.user_id
        )
        
        if not project_data or not project_data.get("project"):
            raise HTTPException(status_code=404, detail="Projeto não encontrado")
        
        project = project_data["project"]
        current_html = project.get("content", {}).get("html", "")
        
        if not current_html:
            raise HTTPException(status_code=400, detail="Projeto sem conteúdo HTML")
        
        logger.info(f"📄 HTML atual encontrado - {len(current_html)} caracteres")
        
        # Coordenar modificação
        result = await ai_coordinator.modify_email_intelligently(
            html=current_html,
            instructions=request.instructions,
            context={
                "project_name": project.get("name", ""),
                "industry": project.get("metadata", {}).get("industry", "geral"),
                "tone": project.get("metadata", {}).get("tone", "professional")
            },
            preserve_structure=request.preserve_structure
        )
        
        # Re-otimizar CSS
        optimized_result = await css_expert.optimize_for_email_clients(
            html=result["html"],
            enable_dark_mode=True
        )
        
        # Atualizar projeto no MongoDB
        update_success = await mongodb_client.update_project_content(
            project_id=request.project_id,
            user_id=request.user_id,
            new_content={
                "html": optimized_result["html"],
                "subject": result.get("subject", project.get("content", {}).get("subject")),
                "text": result.get("text", ""),
                "previewText": project.get("content", {}).get("previewText")
            },
            modification_details={
                "instructions": request.instructions,
                "currentVersion": project.get("metadata", {}).get("version", 1),
                "confidence": result.get("confidence", 0.9)
            }
        )
        
        processing_time = (datetime.now() - start_time).total_seconds()
        
        response_data = {
            "subject": result.get("subject"),
            "html": optimized_result["html"],
            "text": result.get("text"),
            "modifications_applied": result["modifications_applied"],
            "project_updated": update_success
        }
        
        metadata = {
            "processing_time": processing_time,
            "modifications_count": len(result["modifications_applied"]),
            "css_optimizations": optimized_result["optimizations"],
            "confidence": result["confidence"],
            "mongodb_update": update_success
        }
        
        logger.success(f"✅ Email modificado - Projeto {'atualizado' if update_success else 'não atualizado'}")
        
        return EmailResponse(
            success=True,
            data=response_data,
            metadata=metadata,
            processing_time=processing_time,
            timestamp=datetime.now()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        processing_time = (datetime.now() - start_time).total_seconds()
        logger.error(f"❌ Erro na modificação: {e}")
        
        raise HTTPException(
            status_code=500,
            detail={
                "error": str(e),
                "processing_time": processing_time
            }
        )

@app.post("/chat/process")
async def process_chat_message(request: ChatProcessingRequest):
    """
    ✅ ENDPOINT: Processamento de Chat COM MONGODB
    """
    start_time = datetime.now()
    
    try:
        logger.info(f"💬 Processando chat - Chat: {request.chat_id}")
        
        # Buscar dados do chat e projeto
        project_data = None
        if request.project_id:
            project_data = await mongodb_client.get_project_with_chat(
                project_id=request.project_id,
                user_id=request.user_id
            )
        
        # Buscar histórico do chat
        chat_messages = await mongodb_client.get_chat_messages(
            chat_id=request.chat_id,
            limit=10
        )
        
        # Preparar contexto
        project_context = {
            "userId": request.user_id,
            "projectName": "Chat Geral",
            "type": "newsletter",
            "industry": "geral",
            "hasProjectContent": False,
            "currentEmailContent": None
        }
        
        if project_data and project_data.get("project"):
            project = project_data["project"]
            project_context.update({
                "projectName": project.get("name", ""),
                "type": project.get("type", "newsletter"),
                "industry": project.get("metadata", {}).get("industry", "geral"),
                "tone": project.get("metadata", {}).get("tone", "professional"),
                "hasProjectContent": bool(project.get("content", {}).get("html")),
                "currentEmailContent": project.get("content", {})
            })
        
        # Processar com IA
        ai_response = await ai_coordinator.smartChatWithAI(
            message=request.message,
            chatHistory=[{
                "role": "user" if msg["type"] == "user" else "assistant",
                "content": msg["content"]
            } for msg in chat_messages],
            projectContext=project_context
        )
        
        # Salvar mensagem do usuário
        user_message_id = await mongodb_client.create_chat_message(
            chat_id=request.chat_id,
            message_type="user",
            content=request.message,
            metadata={"timestamp": datetime.now()}
        )
        
        # Salvar resposta da IA
        ai_message_id = await mongodb_client.create_chat_message(
            chat_id=request.chat_id,
            message_type="ai",
            content=ai_response["response"],
            metadata={
                "emailUpdated": ai_response["shouldUpdateEmail"],
                "model": ai_response["metadata"]["model"],
                "confidence": ai_response["metadata"]["confidence"],
                "timestamp": datetime.now()
            }
        )
        
        # Atualizar projeto se necessário
        project_updated = False
        if ai_response["shouldUpdateEmail"] and ai_response.get("enhancedContent") and request.project_id:
            enhanced_content = ai_response["enhancedContent"]
            project_updated = await mongodb_client.update_project_content(
                project_id=request.project_id,
                user_id=request.user_id,
                new_content=enhanced_content,
                modification_details={
                    "chat_message": request.message,
                    "ai_confidence": ai_response["metadata"]["confidence"]
                }
            )
        
        # Atualizar metadata do chat
        await mongodb_client.update_chat_metadata(
            chat_id=request.chat_id,
            metadata_update={
                "totalMessages": len(chat_messages) + 2,
                "lastUpdateSuccess": project_updated
            }
        )
        
        processing_time = (datetime.now() - start_time).total_seconds()
        
        return {
            "success": True,
            "data": {
                "ai_response": ai_response["response"],
                "should_update_email": ai_response["shouldUpdateEmail"],
                "project_updated": project_updated,
                "user_message_id": user_message_id,
                "ai_message_id": ai_message_id,
                "enhanced_content": ai_response.get("enhancedContent")
            },
            "metadata": {
                "processing_time": processing_time,
                "model": ai_response["metadata"]["model"],
                "confidence": ai_response["metadata"]["confidence"],
                "mongodb_operations": "completed"
            },
            "timestamp": datetime.now()
        }
        
    except Exception as e:
        processing_time = (datetime.now() - start_time).total_seconds()
        logger.error(f"❌ Erro no processamento do chat: {e}")
        
        raise HTTPException(
            status_code=500,
            detail={
                "error": str(e),
                "processing_time": processing_time
            }
        )

@app.post("/optimize-css", response_model=EmailResponse)
async def optimize_css(request: CSSOptimizationRequest):
    """
    ✅ ENDPOINT: Otimização Avançada de CSS
    """
    start_time = datetime.now()
    
    try:
        logger.info("🎨 Otimizando CSS para email clients...")
        
        result = await css_expert.optimize_for_email_clients(
            html=request.html,
            target_clients=request.target_clients,
            enable_dark_mode=request.enable_dark_mode,
            mobile_first=request.mobile_first
        )
        
        processing_time = (datetime.now() - start_time).total_seconds()
        
        return EmailResponse(
            success=True,
            data=result,
            metadata={
                "processing_time": processing_time,
                "optimizations_applied": len(result["optimizations"]),
                "compatibility_score": result["compatibility_score"]
            },
            processing_time=processing_time,
            timestamp=datetime.now()
        )
        
    except Exception as e:
        processing_time = (datetime.now() - start_time).total_seconds()
        logger.error(f"❌ Erro na otimização CSS: {e}")
        
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/validate")
async def validate_email(html: str):
    """
    ✅ ENDPOINT: Validação de HTML de Email
    """
    try:
        validation_result = email_validator.validate_email_html(html)
        
        return {
            "valid": validation_result["valid"],
            "issues": validation_result["issues"],
            "suggestions": validation_result["suggestions"],
            "compatibility": validation_result.get("client_compatibility", {}),
            "accessibility_score": validation_result["accessibility_score"],
            "performance_score": validation_result["performance_score"],
            "overall_score": validation_result["overall_score"]
        }
        
    except Exception as e:
        logger.error(f"❌ Erro na validação: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/metrics")
async def get_metrics():
    """Endpoint de métricas detalhadas"""
    try:
        performance_summary = performance_monitor.get_performance_summary()
        detailed_metrics = performance_monitor.get_detailed_metrics()
        mongodb_stats = await mongodb_client.get_collection_stats()
        
        return {
            "performance": performance_summary,
            "detailed": detailed_metrics,
            "mongodb": mongodb_stats,
            "timestamp": datetime.now()
        }
    except Exception as e:
        logger.error(f"❌ Erro ao obter métricas: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Configuração de logging
logging.basicConfig(level=logging.INFO)
logger.add("logs/ai-service.log", rotation="1 day", retention="30 days")

if __name__ == "__main__":
    # Configuração para desenvolvimento
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 5000)),
        reload=True,
        log_level="info"
    )