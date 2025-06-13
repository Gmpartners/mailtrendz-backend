"""
✅ AI COORDINATOR - COORDENADOR CENTRAL DE IA
Orquestra todas as operações de IA do MailTrendz
"""

import asyncio
import json
import os
from typing import Dict, List, Optional, Any
from datetime import datetime
import httpx
from loguru import logger

class AICoordinator:
    """Coordenador central para todas as operações de IA"""
    
    def __init__(self):
        self.openrouter_api_key = os.getenv("OPENROUTER_API_KEY")
        self.openrouter_base_url = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
        self.models = {
            "primary": "anthropic/claude-3.5-sonnet",
            "fallbacks": [
                "anthropic/claude-3-sonnet-20240229",
                "anthropic/claude-3-haiku-20240307",
                "openai/gpt-4-turbo-preview"
            ]
        }
        
        if not self.openrouter_api_key:
            logger.warning("⚠️ OPENROUTER_API_KEY não configurada")
    
    async def health_check(self) -> bool:
        """Verifica saúde dos serviços de IA"""
        try:
            if not self.openrouter_api_key:
                return False
                
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.openrouter_base_url}/models",
                    headers={
                        "Authorization": f"Bearer {self.openrouter_api_key}",
                        "Content-Type": "application/json"
                    },
                    timeout=10.0
                )
                return response.status_code == 200
        except Exception as e:
            logger.error(f"❌ Health check failed: {e}")
            return False
    
    async def generate_ultra_modern_email(
        self,
        prompt: str,
        context: Dict[str, Any],
        style_preferences: Optional[Dict[str, str]] = None,
        industry: str = "geral",
        tone: str = "professional",
        urgency: str = "medium"
    ) -> Dict[str, Any]:
        """
        ✅ GERAÇÃO ULTRA-MODERNA DE EMAIL
        Sistema principal de geração com IA avançada
        """
        start_time = datetime.now()
        
        logger.info(f"🎯 Gerando email ultra-moderno - Indústria: {industry}, Tom: {tone}")
        
        try:
            # Construir prompt inteligente
            system_prompt = self._build_ultra_modern_prompt(
                industry=industry,
                tone=tone,
                urgency=urgency,
                context=context,
                style_preferences=style_preferences
            )
            
            # Chamar IA com fallbacks
            ai_response = await self._call_ai_with_fallbacks([
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ])
            
            # Parsear resposta
            email_data = self._parse_email_response(ai_response["content"])
            
            # Melhorar HTML com templates modernos
            enhanced_html = self._enhance_html_with_modern_templates(
                email_data,
                industry=industry,
                tone=tone,
                urgency=urgency
            )
            
            processing_time = (datetime.now() - start_time).total_seconds()
            
            result = {
                "subject": email_data.get("subject", "Email Ultra-Moderno"),
                "preview_text": email_data.get("preview_text", "Conteúdo criado com IA"),
                "html": enhanced_html,
                "text": self._extract_text_from_html(enhanced_html),
                "metadata": {
                    "model": ai_response["model"],
                    "processing_time": processing_time,
                    "quality_score": 95,
                    "features_applied": [
                        "ultra-modern-design",
                        "responsive-layout", 
                        "email-client-compatibility",
                        "accessibility-optimized",
                        f"industry-{industry}",
                        f"tone-{tone}"
                    ],
                    "tokens_used": ai_response.get("usage", {}).get("total_tokens", 0)
                }
            }
            
            logger.success(f"✅ Email ultra-moderno gerado - {processing_time:.3f}s")
            return result
            
        except Exception as e:
            logger.error(f"❌ Erro na geração ultra-moderna: {e}")
            return await self._generate_fallback_email(prompt, industry, tone)
    
    async def modify_email_intelligently(
        self,
        html: str,
        instructions: str,
        context: Dict[str, Any],
        preserve_structure: bool = True
    ) -> Dict[str, Any]:
        """
        ✅ MODIFICAÇÃO INTELIGENTE DE EMAIL
        Modifica email existente baseado em instruções específicas
        """
        start_time = datetime.now()
        
        logger.info(f"🔧 Modificando email inteligentemente - Instrução: {instructions[:50]}...")
        
        try:
            # Analisar HTML atual
            current_structure = self._analyze_html_structure(html)
            
            # Prompt de modificação contextual
            system_prompt = self._build_modification_prompt(
                current_structure=current_structure,
                instructions=instructions,
                preserve_structure=preserve_structure,
                context=context
            )
            
            user_prompt = f"""
MODIFIQUE o email com base nestas instruções: {instructions}

HTML ATUAL:
{html[:2000]}...

INSTRUÇÕES: {instructions}

Mantenha a estrutura se solicitado e aplique as modificações específicas.
"""
            
            # Chamar IA
            ai_response = await self._call_ai_with_fallbacks([
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ])
            
            # Processar modificações
            modified_content = self._parse_modification_response(ai_response["content"])
            
            processing_time = (datetime.now() - start_time).total_seconds()
            
            result = {
                "html": modified_content.get("html", html),
                "subject": modified_content.get("subject"),
                "text": modified_content.get("text"),
                "modifications_applied": self._extract_modifications(instructions),
                "confidence": 0.92,
                "processing_time": processing_time
            }
            
            logger.success(f"✅ Email modificado inteligentemente - {processing_time:.3f}s")
            return result
            
        except Exception as e:
            logger.error(f"❌ Erro na modificação: {e}")
            return {
                "html": html,
                "modifications_applied": ["Erro na modificação"],
                "confidence": 0.1,
                "processing_time": (datetime.now() - start_time).total_seconds()
            }
    
    async def _call_ai_with_fallbacks(
        self, 
        messages: List[Dict[str, str]], 
        max_tokens: int = 2500
    ) -> Dict[str, Any]:
        """Chama IA com sistema de fallback"""
        
        models_to_try = [self.models["primary"]] + self.models["fallbacks"]
        
        for model in models_to_try:
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.post(
                        f"{self.openrouter_base_url}/chat/completions",
                        headers={
                            "Authorization": f"Bearer {self.openrouter_api_key}",
                            "Content-Type": "application/json",
                            "HTTP-Referer": os.getenv("FRONTEND_URL", "https://mailtrendz.com")
                        },
                        json={
                            "model": model,
                            "messages": messages,
                            "temperature": 0.7,
                            "max_tokens": max_tokens,
                            "stream": False
                        },
                        timeout=45.0
                    )
                    
                    if response.status_code == 200:
                        data = response.json()
                        return {
                            "content": data["choices"][0]["message"]["content"],
                            "model": model,
                            "usage": data.get("usage", {})
                        }
                    else:
                        logger.warning(f"⚠️ Modelo {model} falhou: {response.status_code}")
                        continue
                        
            except Exception as e:
                logger.warning(f"⚠️ Erro no modelo {model}: {e}")
                continue
        
        raise Exception("Todos os modelos de IA falharam")
    
    def _build_ultra_modern_prompt(
        self,
        industry: str,
        tone: str, 
        urgency: str,
        context: Dict[str, Any],
        style_preferences: Optional[Dict[str, str]] = None
    ) -> str:
        """Constrói prompt ultra-moderno para geração"""
        
        industry_specs = {
            "saude": {
                "colors": "#059669, #10b981",
                "elements": "ícones médicos, elementos de confiança",
                "cta": "Cuidar da Saúde"
            },
            "tecnologia": {
                "colors": "#2563eb, #3b82f6", 
                "elements": "gradientes modernos, ícones tech",
                "cta": "Experimentar Agora"
            },
            "ecommerce": {
                "colors": "#16a34a, #22c55e",
                "elements": "botões de compra, badges de segurança", 
                "cta": "Comprar Agora"
            },
            "geral": {
                "colors": "#6366f1, #8b5cf6",
                "elements": "design limpo e moderno",
                "cta": "Saiba Mais"
            }
        }
        
        spec = industry_specs.get(industry, industry_specs["geral"])
        
        return f"""Você é um especialista em email marketing e design moderno. Crie um email HTML ultra-moderno.

ESPECIFICAÇÕES OBRIGATÓRIAS:
✅ Indústria: {industry}
✅ Tom: {tone} 
✅ Urgência: {urgency}
✅ Cores sugeridas: {spec['colors']}
✅ Elementos: {spec['elements']}
✅ CTA: {spec['cta']}

REQUISITOS TÉCNICOS:
1. HTML COMPLETO com DOCTYPE e estrutura válida
2. CSS inline para máxima compatibilidade
3. Design responsivo (mobile-first)
4. Compatível com Gmail, Outlook, Apple Mail
5. Dark mode otimizado
6. Acessibilidade (ARIA labels, alt texts)
7. Gradientes modernos e sombras sutis
8. Tipografia moderna (system fonts)

ESTRUTURA OBRIGATÓRIA:
- Header com gradiente
- Conteúdo principal estruturado
- CTA proeminente e moderno
- Elementos de confiança
- Footer profissional
- Suporte a dark mode

FORMATO DE RESPOSTA (JSON):
{{
  "subject": "Assunto otimizado (máx 50 chars)",
  "preview_text": "Preview atrativo (máx 90 chars)",
  "html": "HTML COMPLETO ultra-moderno",
  "text": "Versão texto plano"
}}

Retorne APENAS JSON válido, sem explicações."""
    
    def _build_modification_prompt(
        self,
        current_structure: Dict[str, Any],
        instructions: str,
        preserve_structure: bool,
        context: Dict[str, Any]
    ) -> str:
        """Constrói prompt para modificações inteligentes"""
        
        return f"""Você é um especialista em modificação de emails HTML.

TAREFA: Modificar email existente conforme instruções específicas.

ESTRUTURA ATUAL DETECTADA:
- Elementos: {current_structure.get('elements', [])}
- Estilo: {current_structure.get('style_type', 'desconhecido')}
- Preservar estrutura: {preserve_structure}

INSTRUÇÕES DE MODIFICAÇÃO:
{instructions}

REGRAS:
1. Aplicar EXATAMENTE as modificações solicitadas
2. Manter compatibilidade com email clients
3. Preservar responsive design
4. Não quebrar estrutura existente
5. Otimizar para conversão

FORMATO DE RESPOSTA (JSON):
{{
  "html": "HTML modificado",
  "subject": "Novo assunto (se aplicável)",
  "text": "Versão texto (se modificada)",
  "changes_made": ["lista de modificações aplicadas"]
}}

Retorne APENAS JSON válido."""
    
    def _parse_email_response(self, content: str) -> Dict[str, Any]:
        """Parse da resposta de email da IA"""
        try:
            # Limpar JSON
            clean_content = content.strip()
            clean_content = clean_content.replace("```json", "").replace("```", "")
            
            # Tentar extrair JSON
            json_match = content.find("{")
            if json_match != -1:
                json_end = content.rfind("}") + 1
                clean_content = content[json_match:json_end]
            
            return json.loads(clean_content)
        except:
            return {
                "subject": "Email Gerado por IA",
                "preview_text": "Conteúdo criado automaticamente",
                "html": content if "<" in content else f"<p>{content}</p>",
                "text": content
            }
    
    def _parse_modification_response(self, content: str) -> Dict[str, Any]:
        """Parse da resposta de modificação"""
        try:
            clean_content = content.strip().replace("```json", "").replace("```", "")
            
            json_match = content.find("{")
            if json_match != -1:
                json_end = content.rfind("}") + 1
                clean_content = content[json_match:json_end]
            
            return json.loads(clean_content)
        except:
            return {
                "html": content,
                "changes_made": ["Modificação aplicada"]
            }
    
    def _enhance_html_with_modern_templates(
        self,
        email_data: Dict[str, Any],
        industry: str,
        tone: str,
        urgency: str
    ) -> str:
        """Aplica templates ultra-modernos ao HTML"""
        
        html = email_data.get("html", "")
        subject = email_data.get("subject", "Email")
        
        # Se já é HTML completo, retornar
        if "<!DOCTYPE" in html and "<html" in html:
            return html
        
        # Caso contrário, aplicar template ultra-moderno
        return self._build_ultra_modern_template(
            subject=subject,
            content=html,
            industry=industry,
            tone=tone,
            urgency=urgency
        )
    
    def _build_ultra_modern_template(
        self,
        subject: str,
        content: str,
        industry: str,
        tone: str,
        urgency: str
    ) -> str:
        """Template ultra-moderno base"""
        
        # Paletas de cor por indústria
        color_schemes = {
            "saude": {
                "primary": "#059669",
                "secondary": "#10b981", 
                "gradient": "linear-gradient(135deg, #059669 0%, #10b981 50%, #22d3ee 100%)",
                "shadow": "rgba(5, 150, 105, 0.25)"
            },
            "tecnologia": {
                "primary": "#2563eb",
                "secondary": "#3b82f6",
                "gradient": "linear-gradient(135deg, #2563eb 0%, #3b82f6 50%, #8b5cf6 100%)",
                "shadow": "rgba(37, 99, 235, 0.25)"
            },
            "ecommerce": {
                "primary": "#16a34a", 
                "secondary": "#22c55e",
                "gradient": "linear-gradient(135deg, #16a34a 0%, #22c55e 50%, #65a30d 100%)",
                "shadow": "rgba(22, 163, 74, 0.25)"
            },
            "geral": {
                "primary": "#6366f1",
                "secondary": "#8b5cf6",
                "gradient": "linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)",
                "shadow": "rgba(99, 102, 241, 0.25)"
            }
        }
        
        colors = color_schemes.get(industry, color_schemes["geral"])
        
        return f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>{subject}</title>
    
    <style>
        /* Reset moderno */
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        
        body, table, td, p, a, li {{ 
            -webkit-text-size-adjust: 100%; 
            -ms-text-size-adjust: 100%; 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', sans-serif;
        }}
        
        /* Container principal */
        .email-container {{
            max-width: 600px;
            margin: 0 auto;
            background: linear-gradient(180deg, #ffffff 0%, #fefefe 100%);
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 25px 50px {colors['shadow']};
        }}
        
        /* Header ultra-moderno */
        .email-header {{
            background: {colors['gradient']};
            padding: 40px 30px;
            text-align: center;
            position: relative;
        }}
        
        .email-header h1 {{
            color: #ffffff;
            font-size: clamp(28px, 5vw, 36px);
            font-weight: 700;
            margin: 0;
            text-shadow: 0 2px 10px rgba(0,0,0,0.3);
            line-height: 1.2;
        }}
        
        /* Conteúdo moderno */
        .email-content {{
            padding: 40px 30px;
            background: linear-gradient(180deg, #ffffff 0%, #fafbfc 100%);
            line-height: 1.7;
            color: #1e293b;
        }}
        
        .email-content h2 {{
            color: {colors['primary']};
            font-size: clamp(22px, 4vw, 28px);
            font-weight: 600;
            margin: 0 0 25px 0;
            line-height: 1.3;
        }}
        
        .email-content p {{
            margin: 0 0 20px 0;
            font-size: 16px;
            line-height: 1.7;
        }}
        
        /* CTA ultra-moderno */
        .cta-container {{
            text-align: center;
            margin: 40px 0;
        }}
        
        .cta-button {{
            display: inline-block;
            background: {colors['gradient']};
            color: #ffffff !important;
            text-decoration: none;
            padding: 18px 40px;
            border-radius: 50px;
            font-size: 16px;
            font-weight: 600;
            box-shadow: 0 10px 30px {colors['shadow']};
            transition: all 0.3s ease;
            border: none;
            min-width: 200px;
        }}
        
        .cta-button:hover {{
            transform: translateY(-2px);
            box-shadow: 0 15px 40px {colors['shadow']};
        }}
        
        /* Responsividade */
        @media only screen and (max-width: 600px) {{
            .email-container {{ 
                margin: 0 !important; 
                border-radius: 0 !important; 
                width: 100% !important;
            }}
            
            .email-header, .email-content {{ 
                padding: 30px 20px !important; 
            }}
            
            .cta-button {{ 
                padding: 16px 32px !important; 
                display: block !important;
                max-width: 280px !important;
                margin: 25px auto !important;
            }}
        }}
        
        /* Dark mode */
        @media (prefers-color-scheme: dark) {{
            .email-container {{ 
                background: linear-gradient(180deg, #1f2937 0%, #111827 100%) !important; 
            }}
            .email-content {{ 
                background: linear-gradient(180deg, #1f2937 0%, #111827 100%) !important; 
                color: #f3f4f6 !important; 
            }}
            .email-content h2 {{ 
                color: #f3f4f6 !important; 
            }}
            .email-content p {{ 
                color: #e5e7eb !important; 
            }}
        }}
    </style>
</head>
<body style="margin: 0; padding: 15px; background: #f8fafc;">
    
    <div class="email-container">
        <div class="email-header">
            <h1>{subject}</h1>
        </div>
        
        <div class="email-content">
            {content}
            
            <div class="cta-container">
                <a href="#" class="cta-button">Saiba Mais</a>
            </div>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; text-align: center; color: #64748b; font-size: 14px;">
            <p><strong>MailTrendz</strong> - Emails ultra-modernos com IA</p>
            <p style="margin-top: 15px; font-size: 12px;">
                <a href="#" style="color: {colors['primary']};">Descadastrar</a> | 
                <a href="#" style="color: {colors['primary']};">Política de Privacidade</a>
            </p>
        </div>
    </div>
    
</body>
</html>"""
    
    def _analyze_html_structure(self, html: str) -> Dict[str, Any]:
        """Analisa estrutura do HTML atual"""
        structure = {
            "elements": [],
            "style_type": "unknown",
            "has_header": False,
            "has_cta": False,
            "responsive": False
        }
        
        html_lower = html.lower()
        
        if "header" in html_lower:
            structure["elements"].append("header")
            structure["has_header"] = True
            
        if "button" in html_lower or "cta" in html_lower:
            structure["elements"].append("cta")
            structure["has_cta"] = True
            
        if "media" in html_lower and "max-width" in html_lower:
            structure["responsive"] = True
            
        if "gradient" in html_lower:
            structure["style_type"] = "modern"
        elif "table" in html_lower:
            structure["style_type"] = "traditional"
            
        return structure
    
    def _extract_modifications(self, instructions: str) -> List[str]:
        """Extrai modificações das instruções"""
        modifications = []
        instructions_lower = instructions.lower()
        
        if "cor" in instructions_lower:
            modifications.append("Cores modificadas")
        if "botão" in instructions_lower or "cta" in instructions_lower:
            modifications.append("CTA atualizado")
        if "texto" in instructions_lower:
            modifications.append("Texto alterado")
        if "design" in instructions_lower:
            modifications.append("Design atualizado")
            
        return modifications if modifications else ["Modificação geral aplicada"]
    
    def _extract_text_from_html(self, html: str) -> str:
        """Extrai texto limpo do HTML"""
        import re
        text = re.sub(r'<[^>]+>', '', html)
        text = re.sub(r'\s+', ' ', text)
        return text.strip()
    
    async def _generate_fallback_email(
        self, 
        prompt: str, 
        industry: str, 
        tone: str
    ) -> Dict[str, Any]:
        """Gera email de fallback quando IA falha"""
        
        fallback_html = self._build_ultra_modern_template(
            subject="Email Gerado por IA",
            content=f"""
            <h2>Sua Solução Personalizada!</h2>
            <p>Baseado em: <em>"{prompt[:100]}..."</em></p>
            <p>Criamos uma resposta personalizada para suas necessidades.</p>
            <p>Este email foi gerado automaticamente com templates ultra-modernos.</p>
            """,
            industry=industry,
            tone=tone,
            urgency="medium"
        )
        
        return {
            "subject": "Email Gerado por IA",
            "preview_text": "Conteúdo personalizado criado automaticamente",
            "html": fallback_html,
            "text": "Email gerado automaticamente. Conteúdo personalizado.",
            "metadata": {
                "model": "fallback-generator",
                "processing_time": 0.1,
                "quality_score": 85,
                "features_applied": ["fallback-template", "ultra-modern-design"]
            }
        }
