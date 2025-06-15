"""
✅ VERSÃO ULTRA-SIMPLES PARA RAILWAY - TESTANDO MODIFY
FastAPI básico que sempre funciona + Generate + Modify (versão debug)
"""

import os
import sys
from datetime import datetime
from typing import Dict, Any, Optional

print("🚀 [STARTUP] Iniciando MailTrendz AI Service com MODIFY...")

try:
    from fastapi import FastAPI, HTTPException
    from fastapi.middleware.cors import CORSMiddleware
    from pydantic import BaseModel, Field
    print("✅ [STARTUP] FastAPI imports OK")
except ImportError as e:
    print(f"❌ [STARTUP] FastAPI import failed: {e}")
    sys.exit(1)

# Criar app
app = FastAPI(
    title="MailTrendz AI Service", 
    version="2.0.1-ultra-simple-with-modify-debug"
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

# ================================
# MODELOS PYDANTIC SIMPLIFICADOS
# ================================

class EmailGenerationRequest(BaseModel):
    prompt: str
    industry: str = "geral"
    tone: str = "professional"
    urgency: str = "medium"
    context: Dict[str, Any] = {}
    style_preferences: Optional[Dict[str, str]] = None

class EmailModificationRequest(BaseModel):
    project_id: str
    user_id: str  
    instructions: str
    preserve_structure: bool = True

# ================================
# ENDPOINTS BÁSICOS
# ================================

@app.get("/")
async def root():
    return {
        "service": "MailTrendz AI Service",
        "version": "2.0.1-ultra-simple-with-modify-debug",
        "status": "operational",
        "timestamp": datetime.now().isoformat(),
        "endpoints": {
            "root": "/",
            "health": "/health", 
            "status": "/status",
            "generate": "/generate [POST]",
            "modify": "/modify [POST] ← NOVO!"
        }
    }

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "2.0.1-ultra-simple-with-modify-debug",
        "service": "python-ai-ultra-simple",
        "endpoints_working": ["generate", "modify"]
    }

@app.get("/status")
async def get_status():
    return {
        "service": "MailTrendz AI Service - Ultra Simple",
        "version": "2.0.1-ultra-simple-with-modify-debug", 
        "status": "operational",
        "endpoints_available": ["/", "/health", "/status", "/generate", "/modify"],
        "features": {
            "email_generation": True,
            "email_modification": True,
            "debug_mode": True
        },
        "timestamp": datetime.now().isoformat()
    }

# ================================
# GENERATE (MANTIDO)
# ================================

@app.post("/generate")
async def generate_email_endpoint(request: EmailGenerationRequest):
    try:
        print(f"🎯 [GENERATE] {request.prompt[:30]}...")
        
        result = {
            "id": f"email_{int(datetime.now().timestamp())}",
            "content": {
                "html": f"<h1>Email gerado: {request.prompt}</h1>",
                "text": f"Email: {request.prompt}",
                "subject": f"📧 {request.prompt[:30]}..."
            }
        }
        
        return {
            "success": True,
            "data": result,
            "metadata": {"service": "debug-mode"}
        }
        
    except Exception as e:
        print(f"❌ [GENERATE] Erro: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ================================
# MODIFY (NOVO - VERSÃO DEBUG)
# ================================

@app.post("/modify")
async def modify_email_endpoint(request: EmailModificationRequest):
    try:
        print(f"🔧 [MODIFY] Project: {request.project_id}")
        print(f"🔧 [MODIFY] Instructions: {request.instructions}")
        
        # Simulação simples de modificação
        modified_html = f"""
        <div style="background: blue; color: white; padding: 20px;">
            <h1>Email Modificado!</h1>
            <p>Instruções aplicadas: {request.instructions}</p>
            <p>Project ID: {request.project_id}</p>
            <p>Modificado em: {datetime.now().strftime('%H:%M:%S')}</p>
        </div>
        """
        
        result = {
            "project_id": request.project_id,
            "modifications_applied": ["debug_modification"],
            "modified_content": {
                "html": modified_html,
                "text": f"Email modificado: {request.instructions}",
                "subject": f"✅ Modificado: {request.instructions[:30]}..."
            },
            "project_updated": True
        }
        
        print(f"✅ [MODIFY] Sucesso!")
        
        return {
            "success": True,
            "data": result,
            "metadata": {
                "service": "debug-modify",
                "processing_time": 0.1
            }
        }
        
    except Exception as e:
        print(f"❌ [MODIFY] Erro: {e}")
        print(f"❌ [MODIFY] Request data: {request}")
        raise HTTPException(
            status_code=500, 
            detail={
                "error": str(e),
                "request_data": {
                    "project_id": request.project_id,
                    "instructions": request.instructions
                }
            }
        )

print("✅ [STARTUP] Todas as rotas configuradas")

if __name__ == "__main__":
    print("🚀 [STARTUP] Iniciando uvicorn...")
    
    import uvicorn
    
    port = int(os.getenv("PORT", 5000))
    
    try:
        uvicorn.run(
            "app_simple:app",
            host="0.0.0.0",
            port=port,
            log_level="info"
        )
    except Exception as e:
        print(f"❌ [STARTUP] Erro: {e}")
        sys.exit(1)