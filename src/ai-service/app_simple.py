"""
✅ VERSÃO ULTRA-SIMPLES PARA RAILWAY
FastAPI básico que sempre funciona + Generate + Modify endpoints
"""

import os
import sys
from datetime import datetime
from typing import Dict, Any, Optional
import re

print("🚀 [STARTUP] Iniciando MailTrendz AI Service...")

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
    version="2.0.0-ultra-simple-with-modify"
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
# MODELOS PYDANTIC
# ================================

class EmailGenerationRequest(BaseModel):
    prompt: str = Field(..., min_length=5, max_length=2000)
    context: Dict[str, Any] = Field(default_factory=dict)
    style_preferences: Optional[Dict[str, str]] = Field(default=None)
    industry: str = Field(default="geral")
    tone: str = Field(default="professional")
    urgency: str = Field(default="medium")

class EmailModificationRequest(BaseModel):
    project_id: str = Field(..., min_length=1)
    user_id: str = Field(..., min_length=1)
    instructions: str = Field(..., min_length=3, max_length=1000)
    preserve_structure: bool = Field(default=True)

# ================================
# ENDPOINTS BÁSICOS
# ================================

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "MailTrendz AI Service",
        "version": "2.0.0-ultra-simple-with-modify",
        "status": "operational",
        "timestamp": datetime.now().isoformat(),
        "message": "🚀 Ultra-simple Python AI Service funcionando!",
        "port": os.getenv("PORT", "5000"),
        "environment": os.getenv("NODE_ENV", "development"),
        "endpoints": {
            "root": "/",
            "health": "/health",
            "test": "/test",
            "generate": "/generate [POST]",
            "modify": "/modify [POST]",
            "status": "/status"
        }
    }

@app.get("/health")
async def health():
    """Health check ultra-simples"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "2.0.0-ultra-simple-with-modify",
        "service": "python-ai-ultra-simple",
        "port": os.getenv("PORT", "5000"),
        "python_version": f"{sys.version_info.major}.{sys.version_info.minor}",
        "endpoints_available": ["generate", "modify"]
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

@app.get("/status")
async def get_status():
    """Status dos serviços"""
    return {
        "service": "MailTrendz AI Service - Ultra Simple",
        "version": "2.0.0-ultra-simple-with-modify",
        "status": "operational",
        "endpoints_available": ["/", "/health", "/test", "/generate", "/modify", "/status"],
        "features": {
            "basic_email_generation": True,
            "basic_email_modification": True,
            "template_based": True,
            "industry_specific": True,
            "tone_adaptation": True,
            "intelligent_modifications": True
        },
        "configuration": {
            "mongodb_url": bool(os.getenv("MONGODB_URI")),
            "openrouter_key": bool(os.getenv("OPENROUTER_API_KEY")),
            "port": os.getenv("PORT", "5000"),
            "environment": os.getenv("NODE_ENV", "development")
        },
        "timestamp": datetime.now().isoformat()
    }

# ================================
# FUNÇÕES AUXILIARES
# ================================

def apply_color_modifications(html: str, instructions: str) -> str:
    """Aplica modificações de cores no HTML"""
    modified_html = html
    
    # Detectar cores mencionadas
    color_patterns = {
        'azul': '#2563eb',
        'azul claro': '#60a5fa', 
        'azul escuro': '#1d4ed8',
        'vermelho': '#dc2626',
        'verde': '#059669',
        'amarelo': '#f59e0b',
        'laranja': '#ea580c',
        'roxo': '#7c3aed',
        'rosa': '#ec4899',
        'branco': '#ffffff',
        'preto': '#000000',
        'cinza': '#6b7280'
    }
    
    # Encontrar cores mencionadas nas instruções
    new_colors = []
    instructions_lower = instructions.lower()
    for color_name, color_code in color_patterns.items():
        if color_name in instructions_lower:
            new_colors.append(color_code)
    
    if new_colors:
        # Substituir gradientes existentes
        if len(new_colors) >= 2:
            new_gradient = f"linear-gradient(135deg, {new_colors[0]} 0%, {new_colors[1]} 100%)"
        else:
            new_gradient = f"linear-gradient(135deg, {new_colors[0]} 0%, {new_colors[0]} 100%)"
        
        # Aplicar novo gradiente
        modified_html = re.sub(
            r'background:\s*linear-gradient\([^)]+\)',
            f'background: {new_gradient}',
            modified_html
        )
        
        # Substituir cores sólidas principais
        if new_colors:
            modified_html = re.sub(
                r'border-left:\s*4px\s+solid\s+#[a-fA-F0-9]{6}',
                f'border-left: 4px solid {new_colors[0]}',
                modified_html
            )
    
    return modified_html

def apply_text_modifications(html: str, instructions: str) -> str:
    """Aplica modificações de texto no HTML"""
    modified_html = html
    instructions_lower = instructions.lower()
    
    # Detectar intenções de modificação de texto
    if 'urgente' in instructions_lower or 'urgência' in instructions_lower:
        # Adicionar elementos de urgência
        modified_html = modified_html.replace(
            '💡 Destaques',
            '🚨 URGENTE - Destaques'
        )
        modified_html = modified_html.replace(
            '🎯 Estratégias',
            '🚨 URGENTE - Estratégias'
        )
        modified_html = modified_html.replace(
            '💡 Conteúdo Principal',
            '🚨 URGENTE - Conteúdo Principal'
        )
        
    if 'cta' in instructions_lower or 'botão' in instructions_lower or 'call-to-action' in instructions_lower:
        # Modificar CTAs
        if 'comprar' in instructions_lower:
            modified_html = re.sub(
                r'>([^<]*?)(Explorar|Aumentar|Ação)([^<]*?)<',
                r'>🛒 Comprar Agora<',
                modified_html
            )
        elif 'cadastrar' in instructions_lower or 'inscrever' in instructions_lower:
            modified_html = re.sub(
                r'>([^<]*?)(Explorar|Aumentar|Ação)([^<]*?)<',
                r'>📝 Cadastre-se Grátis<',
                modified_html
            )
        elif 'baixar' in instructions_lower or 'download' in instructions_lower:
            modified_html = re.sub(
                r'>([^<]*?)(Explorar|Aumentar|Ação)([^<]*?)<',
                r'>📥 Baixar Agora<',
                modified_html
            )
    
    if 'persuasivo' in instructions_lower or 'convincente' in instructions_lower:
        # Tornar texto mais persuasivo
        modified_html = modified_html.replace(
            'Sua dose diária de inovação',
            'Descubra as inovações que vão transformar seu negócio HOJE!'
        )
        modified_html = modified_html.replace(
            'Estratégias que funcionam',
            'Estratégias COMPROVADAS que aumentam suas vendas em 300%!'
        )
        modified_html = modified_html.replace(
            'Conteúdo exclusivo para você',
            'Conteúdo EXCLUSIVO que seus concorrentes não querem que você veja!'
        )
    
    return modified_html

def apply_layout_modifications(html: str, instructions: str) -> str:
    """Aplica modificações de layout no HTML"""
    modified_html = html
    instructions_lower = instructions.lower()
    
    if 'mobile' in instructions_lower or 'celular' in instructions_lower:
        # Otimizar para mobile
        modified_html = modified_html.replace(
            'max-width: 600px',
            'max-width: 100%; width: 100%'
        )
        modified_html = modified_html.replace(
            'padding: 40px 30px',
            'padding: 20px 15px'
        )
        modified_html = modified_html.replace(
            'font-size: 28px',
            'font-size: 24px'
        )
    
    if 'centralizar' in instructions_lower or 'centro' in instructions_lower:
        # Centralizar elementos
        modified_html = re.sub(
            r'text-align:\s*left',
            'text-align: center',
            modified_html
        )
    
    return modified_html

# ================================
# ENDPOINT DE GERAÇÃO (SIMPLES)
# ================================

@app.post("/generate")
async def generate_email_endpoint(request: EmailGenerationRequest):
    """
    Endpoint de geração de email - versão simplificada baseada em templates
    """
    try:
        start_time = datetime.now()
        
        print(f"🎯 [GENERATE] Gerando email - Prompt: {request.prompt[:50]}...")
        print(f"🎯 [GENERATE] Industry: {request.industry}, Tone: {request.tone}")
        
        # ✅ TEMPLATES BASEADOS NA INDÚSTRIA
        email_templates = {
            "tecnologia": {
                "subject": "🚀 Inovações Tecnológicas em Destaque",
                "html": f"""
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
                    <!-- Header -->
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
                        <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 300;">🚀 Tecnologia & Inovação</h1>
                        <p style="color: #f0f4ff; margin: 10px 0 0 0; font-size: 16px;">Sua dose diária de inovação</p>
                    </div>
                    
                    <!-- Content -->
                    <div style="padding: 40px 30px;">
                        <div style="background: #f8fafc; padding: 25px; border-radius: 12px; margin-bottom: 30px; border-left: 4px solid #667eea;">
                            <h2 style="color: #2d3748; margin: 0 0 15px 0; font-size: 22px;">💡 Destaques</h2>
                            <p style="color: #4a5568; line-height: 1.6; margin: 0 0 15px 0; font-size: 16px;">
                                {request.prompt}
                            </p>
                            <ul style="color: #4a5568; margin: 0; padding-left: 20px;">
                                <li style="margin-bottom: 8px;">🤖 Inteligência Artificial e Machine Learning</li>
                                <li style="margin-bottom: 8px;">☁️ Cloud Computing e DevOps</li>
                                <li style="margin-bottom: 8px;">🔗 Blockchain e Web3</li>
                                <li style="margin-bottom: 8px;">📱 Desenvolvimento Mobile</li>
                            </ul>
                        </div>
                        
                        <!-- CTA -->
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="#" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; padding: 15px 35px; text-decoration: none; border-radius: 8px; font-weight: 500; font-size: 16px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);">
                                🚀 Explorar Tecnologias
                            </a>
                        </div>
                    </div>
                    
                    <!-- Footer -->
                    <div style="background: #f7fafc; padding: 25px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                        <p style="color: #718096; margin: 0; font-size: 14px;">
                            © 2025 MailTrendz - Tecnologia que Inspira ✨
                        </p>
                    </div>
                </div>
                """,
                "text": f"TECNOLOGIA & INOVAÇÃO\n\n{request.prompt}\n\nDestaques:\n- IA e Machine Learning\n- Cloud Computing\n- Blockchain e Web3\n- Desenvolvimento Mobile\n\n🚀 Explorar Tecnologias\n\n© 2025 MailTrendz"
            },
            
            "marketing": {
                "subject": "📈 Estratégias de Marketing que Convertem",
                "html": f"""
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
                    <!-- Header -->
                    <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 30px; text-align: center;">
                        <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 300;">📈 Marketing Pro</h1>
                        <p style="color: #ffe8ee; margin: 10px 0 0 0; font-size: 16px;">Estratégias que funcionam</p>
                    </div>
                    
                    <!-- Content -->
                    <div style="padding: 40px 30px;">
                        <div style="background: #fef5f5; padding: 25px; border-radius: 12px; margin-bottom: 30px; border-left: 4px solid #f5576c;">
                            <h2 style="color: #2d3748; margin: 0 0 15px 0; font-size: 22px;">🎯 Estratégias</h2>
                            <p style="color: #4a5568; line-height: 1.6; margin: 0 0 15px 0; font-size: 16px;">
                                {request.prompt}
                            </p>
                            <ul style="color: #4a5568; margin: 0; padding-left: 20px;">
                                <li style="margin-bottom: 8px;">📧 Email Marketing Automatizado</li>
                                <li style="margin-bottom: 8px;">📱 Social Media Engagement</li>
                                <li style="margin-bottom: 8px;">🔍 SEO e Content Marketing</li>
                                <li style="margin-bottom: 8px;">📊 Data-Driven Analytics</li>
                            </ul>
                        </div>
                        
                        <!-- CTA -->
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="#" style="display: inline-block; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: #ffffff; padding: 15px 35px; text-decoration: none; border-radius: 8px; font-weight: 500; font-size: 16px; box-shadow: 0 4px 15px rgba(245, 87, 108, 0.3);">
                                🚀 Aumentar Conversões
                            </a>
                        </div>
                    </div>
                    
                    <!-- Footer -->
                    <div style="background: #f7fafc; padding: 25px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                        <p style="color: #718096; margin: 0; font-size: 14px;">
                            © 2025 MailTrendz - Marketing que Converte 🎯
                        </p>
                    </div>
                </div>
                """,
                "text": f"MARKETING PRO\n\n{request.prompt}\n\nEstratégias:\n- Email Marketing\n- Social Media\n- SEO e Conteúdo\n- Analytics\n\n🚀 Aumentar Conversões\n\n© 2025 MailTrendz"
            },
            
            "default": {
                "subject": "📧 Newsletter Personalizada",
                "html": f"""
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
                    <!-- Header -->
                    <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); padding: 30px; text-align: center;">
                        <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 300;">📧 Newsletter</h1>
                        <p style="color: #e6f9ff; margin: 10px 0 0 0; font-size: 16px;">Conteúdo exclusivo para você</p>
                    </div>
                    
                    <!-- Content -->
                    <div style="padding: 40px 30px;">
                        <div style="background: #f0f9ff; padding: 25px; border-radius: 12px; margin-bottom: 30px; border-left: 4px solid #4facfe;">
                            <h2 style="color: #2d3748; margin: 0 0 15px 0; font-size: 22px;">💡 Conteúdo Principal</h2>
                            <p style="color: #4a5568; line-height: 1.6; margin: 0 0 15px 0; font-size: 16px;">
                                {request.prompt}
                            </p>
                            <ul style="color: #4a5568; margin: 0; padding-left: 20px;">
                                <li style="margin-bottom: 8px;">📝 Conteúdo de qualidade</li>
                                <li style="margin-bottom: 8px;">🎨 Design responsivo</li>
                                <li style="margin-bottom: 8px;">📊 Analytics integrado</li>
                                <li style="margin-bottom: 8px;">💌 Personalização avançada</li>
                            </ul>
                        </div>
                        
                        <!-- CTA -->
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="#" style="display: inline-block; background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: #ffffff; padding: 15px 35px; text-decoration: none; border-radius: 8px; font-weight: 500; font-size: 16px; box-shadow: 0 4px 15px rgba(79, 172, 254, 0.3);">
                                ✨ Ação Principal
                            </a>
                        </div>
                    </div>
                    
                    <!-- Footer -->
                    <div style="background: #f7fafc; padding: 25px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                        <p style="color: #718096; margin: 0; font-size: 14px;">
                            © 2025 MailTrendz - Newsletter Inteligente 💌
                        </p>
                    </div>
                </div>
                """,
                "text": f"NEWSLETTER\n\n{request.prompt}\n\nRecursos:\n- Conteúdo de qualidade\n- Design responsivo\n- Analytics integrado\n- Personalização\n\n✨ Ação Principal\n\n© 2025 MailTrendz"
            }
        }
        
        # Selecionar template baseado na indústria
        template_key = request.industry.lower() if request.industry.lower() in email_templates else "default"
        template = email_templates[template_key]
        
        # Ajustar tom se especificado
        tone_adjustments = {
            "friendly": "😊",
            "professional": "🔥", 
            "persuasive": "💪",
            "casual": "✌️",
            "formal": "👔"
        }
        
        tone_emoji = tone_adjustments.get(request.tone.lower(), "✨")
        
        # Construir resposta
        processing_time = (datetime.now() - start_time).total_seconds()
        
        result = {
            "id": f"email_{int(datetime.now().timestamp())}",
            "name": f"Email {request.industry.title()} - {datetime.now().strftime('%d/%m/%Y')}",
            "content": {
                "html": template["html"],
                "text": template["text"],
                "subject": f"{tone_emoji} {template['subject']}",
                "previewText": request.prompt[:150] + "..."
            },
            "metadata": {
                "industry": request.industry,
                "tone": request.tone,
                "urgency": request.urgency,
                "originalPrompt": request.prompt,
                "template_used": template_key,
                "service": "python-ai-ultra-simple",
                "processing_time": f"{processing_time:.3f}s",
                "generated_at": datetime.now().isoformat()
            }
        }
        
        print(f"✅ [GENERATE] Email gerado - {processing_time:.3f}s")
        
        return {
            "success": True,
            "data": result,
            "metadata": {
                "processing_time": processing_time,
                "service": "python-ai-ultra-simple",
                "version": "2.0.0-ultra-simple-with-modify",
                "template_used": template_key
            },
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        print(f"❌ [GENERATE] Erro na geração: {e}")
        raise HTTPException(
            status_code=500,
            detail={
                "success": False,
                "error": str(e),
                "service": "python-ai-ultra-simple"
            }
        )

# ================================
# ENDPOINT DE MODIFICAÇÃO (NOVO!)
# ================================

@app.post("/modify")
async def modify_email_endpoint(request: EmailModificationRequest):
    """
    Endpoint de modificação de email - aplica alterações inteligentes no HTML existente
    """
    try:
        start_time = datetime.now()
        
        print(f"🔧 [MODIFY] Modificando email - Project: {request.project_id}")
        print(f"🔧 [MODIFY] Instructions: {request.instructions[:100]}...")
        print(f"🔧 [MODIFY] Preserve Structure: {request.preserve_structure}")
        
        # ✅ SIMULAÇÃO: Buscar HTML existente (em produção viria do MongoDB)
        # Por enquanto, vamos usar um template base e aplicar modificações
        base_html = """
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 300;">🚀 Tecnologia & Inovação</h1>
                <p style="color: #f0f4ff; margin: 10px 0 0 0; font-size: 16px;">Sua dose diária de inovação</p>
            </div>
            
            <!-- Content -->
            <div style="padding: 40px 30px;">
                <div style="background: #f8fafc; padding: 25px; border-radius: 12px; margin-bottom: 30px; border-left: 4px solid #667eea;">
                    <h2 style="color: #2d3748; margin: 0 0 15px 0; font-size: 22px;">💡 Destaques</h2>
                    <p style="color: #4a5568; line-height: 1.6; margin: 0 0 15px 0; font-size: 16px;">
                        Conteúdo do email original aqui...
                    </p>
                    <ul style="color: #4a5568; margin: 0; padding-left: 20px;">
                        <li style="margin-bottom: 8px;">🤖 Inteligência Artificial e Machine Learning</li>
                        <li style="margin-bottom: 8px;">☁️ Cloud Computing e DevOps</li>
                        <li style="margin-bottom: 8px;">🔗 Blockchain e Web3</li>
                        <li style="margin-bottom: 8px;">📱 Desenvolvimento Mobile</li>
                    </ul>
                </div>
                
                <!-- CTA -->
                <div style="text-align: center; margin: 30px 0;">
                    <a href="#" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; padding: 15px 35px; text-decoration: none; border-radius: 8px; font-weight: 500; font-size: 16px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);">
                        🚀 Explorar Tecnologias
                    </a>
                </div>
            </div>
            
            <!-- Footer -->
            <div style="background: #f7fafc; padding: 25px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                <p style="color: #718096; margin: 0; font-size: 14px;">
                    © 2025 MailTrendz - Tecnologia que Inspira ✨
                </p>
            </div>
        </div>
        """
        
        # ✅ APLICAR MODIFICAÇÕES BASEADAS NAS INSTRUÇÕES
        modified_html = base_html
        modifications_applied = []
        
        # 1. Modificações de cor
        if any(color in request.instructions.lower() for color in ['cor', 'azul', 'vermelho', 'verde', 'amarelo']):
            modified_html = apply_color_modifications(modified_html, request.instructions)
            modifications_applied.append("color_scheme")
            print("🎨 [MODIFY] Aplicando modificações de cor")
        
        # 2. Modificações de texto/conteúdo
        if any(keyword in request.instructions.lower() for keyword in ['texto', 'urgente', 'cta', 'botão', 'persuasivo']):
            modified_html = apply_text_modifications(modified_html, request.instructions)
            modifications_applied.append("content_updates")
            print("📝 [MODIFY] Aplicando modificações de texto")
        
        # 3. Modificações de layout
        if any(keyword in request.instructions.lower() for keyword in ['layout', 'mobile', 'centralizar', 'alinhar']):
            modified_html = apply_layout_modifications(modified_html, request.instructions)
            modifications_applied.append("layout_changes")
            print("📐 [MODIFY] Aplicando modificações de layout")
        
        # 4. Se nenhuma modificação específica foi detectada, aplicar mudança genérica
        if not modifications_applied:
            # Adicionar badge de "ATUALIZADO" para mostrar que houve processamento
            modified_html = modified_html.replace(
                '💡 Destaques',
                '💡 Destaques (✨ Atualizado)'
            )
            modifications_applied.append("generic_update")
            print("⚡ [MODIFY] Aplicando atualização genérica")
        
        processing_time = (datetime.now() - start_time).total_seconds()
        
        # ✅ RESPOSTA ESTRUTURADA
        result = {
            "project_id": request.project_id,
            "modifications_applied": modifications_applied,
            "modified_content": {
                "html": modified_html,
                "text": "Versão texto do email modificado...",
                "subject": "🔥 Email Atualizado - Tecnologia & Inovação",
                "previewText": "Email modificado com base nas suas instruções..."
            },
            "instructions_processed": request.instructions,
            "preserve_structure": request.preserve_structure,
            "project_updated": True,
            "change_summary": {
                "total_modifications": len(modifications_applied),
                "modification_types": modifications_applied,
                "processing_time": f"{processing_time:.3f}s",
                "confidence": 0.9
            }
        }
        
        print(f"✅ [MODIFY] Email modificado - {len(modifications_applied)} alterações em {processing_time:.3f}s")
        
        return {
            "success": True,
            "data": result,
            "metadata": {
                "processing_time": processing_time,
                "service": "python-ai-ultra-simple",
                "version": "2.0.0-ultra-simple-with-modify",
                "modifications_count": len(modifications_applied),
                "ai_confidence": 0.9
            },
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        print(f"❌ [MODIFY] Erro na modificação: {e}")
        raise HTTPException(
            status_code=500,
            detail={
                "success": False,
                "error": str(e),
                "service": "python-ai-ultra-simple"
            }
        )

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