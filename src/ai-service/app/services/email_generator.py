"""
✅ EMAIL GENERATOR - GERADOR AVANÇADO DE EMAILS
Sistema principal de geração de emails com templates ultra-modernos
"""

import json
import re
from typing import Dict, List, Optional, Any
from datetime import datetime
from loguru import logger

class EmailGenerator:
    """Gerador avançado de emails com templates modernos"""
    
    def __init__(self):
        self.industry_templates = {
            "saude": {
                "icon": "🏥",
                "colors": {
                    "primary": "#059669",
                    "secondary": "#10b981",
                    "accent": "#22d3ee",
                    "gradient": "linear-gradient(135deg, #059669 0%, #10b981 50%, #22d3ee 100%)"
                },
                "trust_elements": [
                    "Aprovado pela ANVISA",
                    "Recomendado por médicos",
                    "Pesquisa científica",
                    "Sem efeitos colaterais"
                ],
                "cta_options": ["Cuidar da Saúde", "Consultar Médico", "Ver Resultados", "Agendar Consulta"],
                "tone_keywords": ["saúde", "bem-estar", "cuidado", "qualidade de vida", "prevenção"]
            },
            "tecnologia": {
                "icon": "💻",
                "colors": {
                    "primary": "#2563eb",
                    "secondary": "#3b82f6", 
                    "accent": "#8b5cf6",
                    "gradient": "linear-gradient(135deg, #2563eb 0%, #3b82f6 50%, #8b5cf6 100%)"
                },
                "trust_elements": [
                    "Segurança garantida",
                    "Tecnologia avançada",
                    "Suporte 24/7",
                    "Certificação ISO"
                ],
                "cta_options": ["Experimentar Agora", "Ver Demo", "Download Grátis", "Começar Teste"],
                "tone_keywords": ["inovação", "tecnologia", "eficiência", "produtividade", "automatização"]
            },
            "educacao": {
                "icon": "📚",
                "colors": {
                    "primary": "#8b5cf6",
                    "secondary": "#a78bfa",
                    "accent": "#c084fc",
                    "gradient": "linear-gradient(135deg, #8b5cf6 0%, #a78bfa 50%, #c084fc 100%)"
                },
                "trust_elements": [
                    "Certificado reconhecido",
                    "Professores especialistas",
                    "+ de 10.000 alunos",
                    "Metodologia aprovada"
                ],
                "cta_options": ["Começar a Aprender", "Ver Cursos", "Matricular-se", "Baixar Material"],
                "tone_keywords": ["aprendizado", "conhecimento", "desenvolvimento", "capacitação", "crescimento"]
            },
            "ecommerce": {
                "icon": "🛍️",
                "colors": {
                    "primary": "#16a34a",
                    "secondary": "#22c55e",
                    "accent": "#65a30d",
                    "gradient": "linear-gradient(135deg, #16a34a 0%, #22c55e 50%, #65a30d 100%)"
                },
                "trust_elements": [
                    "Frete grátis",
                    "Garantia de 30 dias",
                    "Pagamento seguro",
                    "Entrega rápida"
                ],
                "cta_options": ["Comprar Agora", "Ver Ofertas", "Adicionar ao Carrinho", "Aproveitar Desconto"],
                "tone_keywords": ["economia", "desconto", "oferta", "qualidade", "satisfação"]
            },
            "financas": {
                "icon": "💰",
                "colors": {
                    "primary": "#1f2937",
                    "secondary": "#374151",
                    "accent": "#d4af37",
                    "gradient": "linear-gradient(135deg, #1f2937 0%, #374151 50%, #d4af37 100%)"
                },
                "trust_elements": [
                    "Banco Central",
                    "Segurança máxima",
                    "Taxa zero",
                    "Aprovação rápida"
                ],
                "cta_options": ["Solicitar Agora", "Ver Condições", "Simular", "Contratar"],
                "tone_keywords": ["investimento", "economia", "rentabilidade", "segurança", "crescimento"]
            },
            "geral": {
                "icon": "✨",
                "colors": {
                    "primary": "#6366f1",
                    "secondary": "#8b5cf6",
                    "accent": "#a855f7",
                    "gradient": "linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)"
                },
                "trust_elements": [
                    "Qualidade garantida",
                    "Atendimento premium",
                    "Resultados comprovados",
                    "Satisfação total"
                ],
                "cta_options": ["Saiba Mais", "Experimentar", "Ver Detalhes", "Começar Agora"],
                "tone_keywords": ["qualidade", "excelência", "confiança", "resultado", "sucesso"]
            }
        }
        
        self.tone_styles = {
            "professional": {
                "font_family": "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                "border_radius": "12px",
                "shadow_intensity": "0.25",
                "letter_spacing": "normal"
            },
            "friendly": {
                "font_family": "'Poppins', -apple-system, BlinkMacSystemFont, sans-serif",
                "border_radius": "20px",
                "shadow_intensity": "0.2",
                "letter_spacing": "0.3px"
            },
            "urgent": {
                "font_family": "'Source Sans Pro', -apple-system, BlinkMacSystemFont, sans-serif", 
                "border_radius": "8px",
                "shadow_intensity": "0.35",
                "letter_spacing": "0.5px"
            },
            "luxury": {
                "font_family": "'Times New Roman', Times, serif",
                "border_radius": "6px",
                "shadow_intensity": "0.2",
                "letter_spacing": "1px"
            },
            "casual": {
                "font_family": "'Nunito', -apple-system, BlinkMacSystemFont, sans-serif",
                "border_radius": "24px", 
                "shadow_intensity": "0.15",
                "letter_spacing": "0.2px"
            }
        }
        
        self.content_templates = {
            "promotional": {
                "structure": ["header", "hero_section", "benefits", "social_proof", "cta", "footer"],
                "hero_emphasis": "high",
                "benefits_count": 4,
                "social_proof_type": "testimonials"
            },
            "newsletter": {
                "structure": ["header", "intro", "articles", "highlights", "cta", "footer"],
                "hero_emphasis": "medium",
                "articles_count": 3,
                "highlights_count": 2
            },
            "welcome": {
                "structure": ["header", "welcome_message", "getting_started", "resources", "support", "footer"],
                "hero_emphasis": "high",
                "personalization": "high",
                "onboarding_steps": 3
            },
            "transactional": {
                "structure": ["header", "transaction_details", "next_steps", "support", "footer"],
                "hero_emphasis": "low",
                "formality": "high",
                "clarity_focus": "maximum"
            }
        }
    
    def health_check(self) -> bool:
        """Verifica saúde do Email Generator"""
        try:
            test_template = self.industry_templates["geral"]
            return len(test_template["colors"]) > 0
        except:
            return False
    
    def generate_ultra_modern_email(
        self,
        prompt: str,
        industry: str = "geral",
        tone: str = "professional",
        email_type: str = "promotional",
        urgency: str = "medium",
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        ✅ GERAÇÃO ULTRA-MODERNA DE EMAIL
        Método principal para gerar emails modernos
        """
        start_time = datetime.now()
        
        logger.info(f"🎨 Gerando email ultra-moderno - Indústria: {industry}, Tom: {tone}, Tipo: {email_type}")
        
        try:
            # Analisar prompt
            prompt_analysis = self._analyze_prompt(prompt, industry, tone)
            
            # Selecionar template
            template_config = self._select_optimal_template(
                industry=industry,
                tone=tone,
                email_type=email_type,
                urgency=urgency,
                analysis=prompt_analysis
            )
            
            # Gerar conteúdo estruturado
            content_structure = self._generate_content_structure(
                prompt=prompt,
                template_config=template_config,
                analysis=prompt_analysis
            )
            
            # Construir HTML ultra-moderno
            html_email = self._build_ultra_modern_html(
                content_structure=content_structure,
                template_config=template_config,
                context=context
            )
            
            # Gerar versão texto
            text_version = self._generate_text_version(content_structure)
            
            # Otimizar e validar
            optimization_result = self._optimize_and_validate(html_email)
            
            processing_time = (datetime.now() - start_time).total_seconds()
            
            result = {
                "subject": content_structure["subject"],
                "preview_text": content_structure["preview_text"],
                "html": optimization_result["html"],
                "text": text_version,
                "template_config": template_config,
                "content_structure": content_structure,
                "metadata": {
                    "generator": "ultra-modern-email-generator",
                    "version": "2.0.0",
                    "processing_time": processing_time,
                    "industry": industry,
                    "tone": tone,
                    "email_type": email_type,
                    "urgency": urgency,
                    "quality_score": optimization_result["quality_score"],
                    "features": [
                        "ultra-modern-design",
                        "responsive-layout",
                        "dark-mode-support", 
                        "accessibility-optimized",
                        "email-client-compatible",
                        f"industry-{industry}",
                        f"tone-{tone}"
                    ],
                    "prompt_analysis": prompt_analysis
                }
            }
            
            logger.success(f"✅ Email ultra-moderno gerado - {processing_time:.3f}s")
            return result
            
        except Exception as e:
            logger.error(f"❌ Erro na geração: {e}")
            return self._generate_fallback_email(prompt, industry, tone)
    
    def customize_existing_email(
        self,
        html: str,
        modifications: List[str],
        industry: str = "geral",
        tone: str = "professional"
    ) -> Dict[str, Any]:
        """
        ✅ CUSTOMIZAÇÃO DE EMAIL EXISTENTE
        Modifica email existente baseado em instruções
        """
        
        logger.info(f"🔧 Customizando email existente - {len(modifications)} modificações")
        
        try:
            # Analisar HTML atual
            current_analysis = self._analyze_existing_html(html)
            
            # Aplicar modificações
            modified_html = html
            modifications_applied = []
            
            for modification in modifications:
                modification_result = self._apply_single_modification(
                    html=modified_html,
                    modification=modification,
                    industry=industry,
                    tone=tone,
                    current_analysis=current_analysis
                )
                
                modified_html = modification_result["html"]
                modifications_applied.extend(modification_result["changes"])
            
            # Re-otimizar
            optimization_result = self._optimize_and_validate(modified_html)
            
            return {
                "html": optimization_result["html"],
                "modifications_applied": modifications_applied,
                "quality_score": optimization_result["quality_score"],
                "validation_issues": optimization_result["issues"]
            }
            
        except Exception as e:
            logger.error(f"❌ Erro na customização: {e}")
            return {
                "html": html,
                "modifications_applied": ["Erro na customização"],
                "quality_score": 70
            }
    
    def _analyze_prompt(
        self,
        prompt: str,
        industry: str,
        tone: str
    ) -> Dict[str, Any]:
        """Analisa prompt para extração de informações"""
        
        prompt_lower = prompt.lower()
        
        # Detectar tipo de email
        email_type = "promotional"  # default
        if any(word in prompt_lower for word in ["newsletter", "notícia", "atualização"]):
            email_type = "newsletter"
        elif any(word in prompt_lower for word in ["bem-vindo", "welcome", "cadastro"]):
            email_type = "welcome"
        elif any(word in prompt_lower for word in ["confirmação", "recibo", "pedido"]):
            email_type = "transactional"
        
        # Detectar elementos chave
        key_elements = []
        if any(word in prompt_lower for word in ["desconto", "promoção", "oferta"]):
            key_elements.append("discount_offer")
        if any(word in prompt_lower for word in ["urgente", "limitado", "agora"]):
            key_elements.append("urgency")
        if any(word in prompt_lower for word in ["grátis", "free", "gratuito"]):
            key_elements.append("free_offer")
        if any(word in prompt_lower for word in ["novo", "lançamento", "novidade"]):
            key_elements.append("new_product")
        
        # Extrair assunto sugerido
        subject_hints = []
        if "%" in prompt:
            subject_hints.append("percentage_discount")
        if any(word in prompt_lower for word in ["exclusivo", "especial"]):
            subject_hints.append("exclusivity")
        
        # Detectar público-alvo
        target_audience = "geral"
        if any(word in prompt_lower for word in ["empresas", "empresa", "b2b"]):
            target_audience = "business"
        elif any(word in prompt_lower for word in ["cliente", "consumidor", "pessoal"]):
            target_audience = "consumer"
        
        return {
            "email_type": email_type,
            "key_elements": key_elements,
            "subject_hints": subject_hints,
            "target_audience": target_audience,
            "prompt_length": len(prompt),
            "complexity": "high" if len(prompt) > 200 else "medium" if len(prompt) > 100 else "low",
            "industry_keywords": [kw for kw in self.industry_templates[industry]["tone_keywords"] if kw in prompt_lower]
        }
    
    def _select_optimal_template(
        self,
        industry: str,
        tone: str,
        email_type: str,
        urgency: str,
        analysis: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Seleciona template ótimo baseado nos parâmetros"""
        
        template_config = {
            "industry": self.industry_templates.get(industry, self.industry_templates["geral"]),
            "tone_style": self.tone_styles.get(tone, self.tone_styles["professional"]),
            "content_template": self.content_templates.get(email_type, self.content_templates["promotional"]),
            "urgency_level": urgency,
            "customizations": []
        }
        
        # Customizações baseadas na análise
        if "urgency" in analysis["key_elements"]:
            template_config["customizations"].append("urgency_styling")
            template_config["tone_style"]["border_radius"] = "8px"
            template_config["tone_style"]["shadow_intensity"] = "0.4"
        
        if "discount_offer" in analysis["key_elements"]:
            template_config["customizations"].append("discount_emphasis")
        
        if analysis["target_audience"] == "business":
            template_config["customizations"].append("professional_styling")
            template_config["tone_style"]["font_family"] = "'Times New Roman', Times, serif"
        
        return template_config
    
    def _generate_content_structure(
        self,
        prompt: str,
        template_config: Dict[str, Any],
        analysis: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Gera estrutura de conteúdo baseada no template"""
        
        industry_config = template_config["industry"]
        content_template = template_config["content_template"]
        
        # Gerar assunto
        subject = self._generate_subject(prompt, analysis, industry_config)
        
        # Gerar preview text
        preview_text = self._generate_preview_text(subject, analysis)
        
        # Gerar seções de conteúdo
        sections = {}
        
        for section in content_template["structure"]:
            sections[section] = self._generate_section_content(
                section=section,
                prompt=prompt,
                analysis=analysis,
                industry_config=industry_config
            )
        
        return {
            "subject": subject,
            "preview_text": preview_text,
            "sections": sections,
            "cta": self._select_optimal_cta(analysis, industry_config),
            "trust_elements": industry_config["trust_elements"],
            "color_scheme": industry_config["colors"]
        }
    
    def _generate_subject(
        self,
        prompt: str,
        analysis: Dict[str, Any],
        industry_config: Dict[str, Any]
    ) -> str:
        """Gera assunto otimizado"""
        
        # Templates de assunto por tipo
        subject_templates = {
            "promotional": [
                f"{industry_config['icon']} Oferta Especial",
                f"🔥 Promoção Exclusiva",
                f"✨ Oportunidade Única"
            ],
            "newsletter": [
                f"{industry_config['icon']} Novidades da Semana",
                f"📰 Últimas Atualizações",
                f"🚀 O que há de novo"
            ],
            "welcome": [
                f"{industry_config['icon']} Bem-vindo!",
                f"🎉 Conta criada com sucesso",
                f"✨ Vamos começar juntos"
            ]
        }
        
        email_type = analysis["email_type"]
        base_subjects = subject_templates.get(email_type, subject_templates["promotional"])
        
        # Personalizar baseado no prompt
        if "%" in prompt:
            percentage = re.findall(r'(\d+)%', prompt)
            if percentage:
                return f"🔥 {percentage[0]}% OFF - Oferta Limitada!"
        
        if any(word in prompt.lower() for word in ["grátis", "free"]):
            return f"{industry_config['icon']} GRÁTIS - Aproveite Agora!"
        
        if "urgency" in analysis["key_elements"]:
            return f"⚡ ÚLTIMAS HORAS - {base_subjects[0]}"
        
        return base_subjects[0]
    
    def _generate_preview_text(self, subject: str, analysis: Dict[str, Any]) -> str:
        """Gera preview text complementar"""
        
        clean_subject = re.sub(r'[🔥📰🎉✨⚡💰🏥💻📚🛍️]', '', subject).strip()
        
        preview_templates = [
            f"{clean_subject} - Confira os detalhes exclusivos!",
            f"Não perca esta oportunidade única. {clean_subject}",
            f"Especialmente criado para você. {clean_subject}",
            f"Descubra mais sobre nossa proposta especial."
        ]
        
        return preview_templates[0]
    
    def _generate_section_content(
        self,
        section: str,
        prompt: str,
        analysis: Dict[str, Any],
        industry_config: Dict[str, Any]
    ) -> str:
        """Gera conteúdo para seção específica"""
        
        content_generators = {
            "header": lambda: f"<h1>{industry_config['icon']} Sua Solução Está Aqui!</h1>",
            
            "hero_section": lambda: f"""
                <h2>Baseado em sua Solicitação</h2>
                <p><em>"{prompt[:100]}{'...' if len(prompt) > 100 else ''}"</em></p>
                <p>Criamos uma <strong>resposta personalizada</strong> para suas necessidades específicas.</p>
            """,
            
            "benefits": lambda: f"""
                <h3>✨ Principais Vantagens:</h3>
                <ul>
                    <li>Design responsivo ultra-moderno</li>
                    <li>Compatibilidade total com email clients</li>
                    <li>Otimização para conversão</li>
                    <li>Acessibilidade garantida</li>
                </ul>
            """,
            
            "social_proof": lambda: f"""
                <div class="social-proof">
                    <h3>{industry_config['icon']} Por que confiar?</h3>
                    <p>Mais de <strong>50.000 clientes</strong> já aproveitaram nossos serviços!</p>
                </div>
            """,
            
            "cta": lambda: "",  # CTA é gerado separadamente
            
            "footer": lambda: """
                <p>Este email foi gerado com <strong>IA avançada</strong> e templates ultra-modernos.</p>
            """
        }
        
        generator = content_generators.get(section, lambda: f"<p>Conteúdo para {section}</p>")
        return generator()
    
    def _select_optimal_cta(
        self,
        analysis: Dict[str, Any],
        industry_config: Dict[str, Any]
    ) -> str:
        """Seleciona CTA ótimo"""
        
        cta_options = industry_config["cta_options"]
        
        # Selecionar baseado na análise
        if "urgency" in analysis["key_elements"]:
            return cta_options[0] if "Agora" in cta_options[0] else f"{cta_options[0]} Agora"
        
        if "discount_offer" in analysis["key_elements"]:
            return "Aproveitar Oferta"
        
        if "free_offer" in analysis["key_elements"]:
            return "Obter Grátis"
        
        return cta_options[0]
    
    def _build_ultra_modern_html(
        self,
        content_structure: Dict[str, Any],
        template_config: Dict[str, Any],
        context: Optional[Dict[str, Any]] = None
    ) -> str:
        """Constrói HTML ultra-moderno"""
        
        colors = content_structure["color_scheme"]
        tone_style = template_config["tone_style"]
        sections = content_structure["sections"]
        
        html = f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>{content_structure['subject']}</title>
    
    <style>
        /* Reset ultra-moderno */
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        
        body, table, td, p, a, li {{ 
            -webkit-text-size-adjust: 100%; 
            -ms-text-size-adjust: 100%; 
            font-family: {tone_style['font_family']};
        }}
        
        /* Container principal */
        .email-container {{
            max-width: 600px;
            margin: 0 auto;
            background: linear-gradient(180deg, #ffffff 0%, #fefefe 100%);
            border-radius: {tone_style['border_radius']};
            overflow: hidden;
            box-shadow: 0 25px 50px rgba(0, 0, 0, {tone_style['shadow_intensity']});
        }}
        
        /* Header ultra-moderno */
        .email-header {{
            background: {colors['gradient']};
            padding: 40px 30px;
            text-align: center;
        }}
        
        .email-header h1 {{
            color: #ffffff;
            font-size: clamp(28px, 5vw, 36px);
            font-weight: 700;
            margin: 0;
            text-shadow: 0 2px 10px rgba(0,0,0,0.3);
            letter-spacing: {tone_style['letter_spacing']};
        }}
        
        /* Conteúdo */
        .email-content {{
            padding: 40px 30px;
            background: #ffffff;
            line-height: 1.7;
            color: #1e293b;
        }}
        
        .email-content h2 {{
            color: {colors['primary']};
            font-size: clamp(22px, 4vw, 28px);
            font-weight: 600;
            margin: 0 0 25px 0;
        }}
        
        .email-content h3 {{
            color: #1e293b;
            font-size: clamp(18px, 3vw, 22px);
            font-weight: 600;
            margin: 25px 0 15px 0;
        }}
        
        .email-content p {{
            margin: 0 0 20px 0;
            font-size: 16px;
            line-height: 1.7;
        }}
        
        .email-content ul {{
            margin: 0 0 25px 0;
            padding-left: 0;
            list-style: none;
        }}
        
        .email-content li {{
            margin: 0 0 12px 0;
            padding-left: 35px;
            position: relative;
        }}
        
        .email-content li::before {{
            content: '✓';
            position: absolute;
            left: 0;
            top: 2px;
            color: #ffffff;
            font-weight: bold;
            font-size: 12px;
            width: 24px;
            height: 24px;
            background: {colors['gradient']};
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
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
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            transition: all 0.3s ease;
            min-width: 200px;
        }}
        
        .cta-button:hover {{
            transform: translateY(-2px);
            box-shadow: 0 15px 40px rgba(0,0,0,0.25);
        }}
        
        /* Trust elements */
        .trust-section {{
            margin: 35px 0;
            padding: 30px;
            background: linear-gradient(135deg, #f8fafc 0%, rgba(255,255,255,0.9) 100%);
            border-radius: {tone_style['border_radius']};
        }}
        
        .trust-badges {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin: 25px 0;
        }}
        
        .trust-badge {{
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 15px 20px;
            background: #ffffff;
            border: 1px solid {colors['primary']}30;
            border-radius: {tone_style['border_radius']};
            font-size: 14px;
            color: {colors['primary']};
            font-weight: 500;
        }}
        
        .trust-badge::before {{
            content: '✓';
            font-weight: bold;
            color: #ffffff;
            background: {colors['gradient']};
            width: 20px;
            height: 20px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 11px;
        }}
        
        /* Footer */
        .email-footer {{
            background: #f8fafc;
            padding: 40px 30px;
            text-align: center;
            border-top: 1px solid rgba(0,0,0,0.08);
        }}
        
        .email-footer p {{
            color: #64748b;
            font-size: 14px;
            margin: 8px 0;
        }}
        
        /* Responsividade */
        @media only screen and (max-width: 600px) {{
            .email-container {{ 
                margin: 0 !important; 
                border-radius: 0 !important; 
                width: 100% !important;
            }}
            
            .email-header, .email-content, .email-footer {{ 
                padding: 30px 20px !important; 
            }}
            
            .cta-button {{ 
                padding: 16px 32px !important; 
                display: block !important;
                max-width: 280px !important;
                margin: 25px auto !important;
            }}
            
            .trust-badges {{
                grid-template-columns: 1fr;
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
            .email-content h2, .email-content h3 {{ 
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
            {sections.get('header', '<h1>✨ Email Ultra-Moderno</h1>')}
        </div>
        
        <div class="email-content">
            {sections.get('hero_section', '')}
            
            {sections.get('benefits', '')}
            
            <div class="cta-container">
                <a href="#" class="cta-button">{content_structure['cta']}</a>
            </div>
            
            <div class="trust-section">
                <h3 style="text-align: center; margin-bottom: 20px; color: {colors['primary']};">
                    {template_config['industry']['icon']} Por que confiar?
                </h3>
                <div class="trust-badges">
                    {''.join([f'<div class="trust-badge">{element}</div>' for element in content_structure['trust_elements']])}
                </div>
            </div>
            
            {sections.get('social_proof', '')}
        </div>
        
        <div class="email-footer">
            <div style="margin-bottom: 20px;">
                <h4 style="color: {colors['primary']}; margin-bottom: 8px;">MailTrendz</h4>
                <p><strong>Emails ultra-modernos com IA avançada</strong></p>
            </div>
            
            {sections.get('footer', '')}
            
            <p style="margin-top: 20px; font-size: 12px;">
                <a href="#" style="color: {colors['primary']};">Descadastrar</a> | 
                <a href="#" style="color: {colors['primary']};">Política de Privacidade</a>
            </p>
        </div>
    </div>
    
</body>
</html>"""
        
        return html
    
    def _generate_text_version(self, content_structure: Dict[str, Any]) -> str:
        """Gera versão texto do email"""
        
        text_parts = [
            content_structure["subject"],
            "=" * len(content_structure["subject"]),
            "",
        ]
        
        # Adicionar conteúdo das seções em formato texto
        for section_name, section_content in content_structure["sections"].items():
            if section_content and section_name != "footer":
                # Remover HTML tags
                clean_text = re.sub(r'<[^>]+>', '', section_content)
                clean_text = re.sub(r'\s+', ' ', clean_text).strip()
                
                if clean_text:
                    text_parts.append(clean_text)
                    text_parts.append("")
        
        # Adicionar CTA
        text_parts.extend([
            f"👉 {content_structure['cta']}",
            "",
            "---",
            "MailTrendz - Emails modernos com IA",
            "Criado automaticamente com templates ultra-modernos"
        ])
        
        return "\n".join(text_parts)
    
    def _optimize_and_validate(self, html: str) -> Dict[str, Any]:
        """Otimiza e valida HTML gerado"""
        
        # Otimizações básicas
        optimized_html = html
        
        # Remover espaços desnecessários
        optimized_html = re.sub(r'\s+', ' ', optimized_html)
        optimized_html = re.sub(r'>\s+<', '><', optimized_html)
        
        # Validações básicas
        issues = []
        
        if len(optimized_html) > 102400:  # 100KB
            issues.append("HTML size exceeds 100KB")
        
        if "alt=" not in optimized_html and "<img" in optimized_html:
            issues.append("Images missing alt attributes")
        
        quality_score = max(70, 100 - len(issues) * 10)
        
        return {
            "html": optimized_html,
            "quality_score": quality_score,
            "issues": issues
        }
    
    def _analyze_existing_html(self, html: str) -> Dict[str, Any]:
        """Analisa HTML existente"""
        
        return {
            "has_header": "email-header" in html or "<h1" in html,
            "has_cta": "cta-button" in html or "button" in html.lower(),
            "has_footer": "email-footer" in html or "footer" in html.lower(),
            "color_scheme": self._extract_color_scheme(html),
            "estimated_type": self._estimate_email_type(html)
        }
    
    def _apply_single_modification(
        self,
        html: str,
        modification: str,
        industry: str,
        tone: str,
        current_analysis: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Aplica modificação única"""
        
        modified_html = html
        changes = []
        
        modification_lower = modification.lower()
        
        # Modificações de cor
        if "cor" in modification_lower:
            if "azul" in modification_lower:
                modified_html = self._apply_color_change(modified_html, "#2563eb")
                changes.append("Cores alteradas para azul")
            elif "verde" in modification_lower:
                modified_html = self._apply_color_change(modified_html, "#059669")
                changes.append("Cores alteradas para verde")
            elif "roxo" in modification_lower:
                modified_html = self._apply_color_change(modified_html, "#8b5cf6")
                changes.append("Cores alteradas para roxo")
        
        # Modificações de CTA
        if "botão" in modification_lower or "cta" in modification_lower:
            if "mudar" in modification_lower or "alterar" in modification_lower:
                modified_html = self._modify_cta(modified_html, modification)
                changes.append("CTA modificado")
        
        # Modificações de texto
        if "texto" in modification_lower:
            modified_html = self._modify_text_content(modified_html, modification)
            changes.append("Conteúdo de texto modificado")
        
        return {
            "html": modified_html,
            "changes": changes
        }
    
    def _apply_color_change(self, html: str, new_color: str) -> str:
        """Aplica mudança de cor"""
        
        # Substituir cores principais
        color_patterns = [
            (r'color:\s*#[0-9a-fA-F]{6}', f'color: {new_color}'),
            (r'background:\s*#[0-9a-fA-F]{6}', f'background: {new_color}'),
            (r'border-color:\s*#[0-9a-fA-F]{6}', f'border-color: {new_color}')
        ]
        
        modified_html = html
        for pattern, replacement in color_patterns:
            modified_html = re.sub(pattern, replacement, modified_html)
        
        return modified_html
    
    def _modify_cta(self, html: str, modification: str) -> str:
        """Modifica CTA"""
        
        # Procurar texto do CTA na modificação
        cta_text_match = re.search(r'"([^"]+)"', modification)
        if cta_text_match:
            new_cta_text = cta_text_match.group(1)
            
            # Substituir texto do CTA
            html = re.sub(
                r'(<a[^>]*class="cta-button"[^>]*>)([^<]+)(</a>)',
                f'\\1{new_cta_text}\\3',
                html
            )
        
        return html
    
    def _modify_text_content(self, html: str, modification: str) -> str:
        """Modifica conteúdo de texto"""
        
        # Extrair novo texto da modificação
        text_match = re.search(r'"([^"]+)"', modification)
        if text_match:
            new_text = text_match.group(1)
            
            # Substituir primeiro parágrafo
            html = re.sub(
                r'(<p[^>]*>)([^<]+)(</p>)',
                f'\\1{new_text}\\3',
                html,
                count=1
            )
        
        return html
    
    def _extract_color_scheme(self, html: str) -> Dict[str, str]:
        """Extrai esquema de cores do HTML"""
        
        colors = {}
        
        # Procurar cores hex
        hex_colors = re.findall(r'#[0-9a-fA-F]{6}', html)
        if hex_colors:
            colors["primary"] = hex_colors[0]
            if len(hex_colors) > 1:
                colors["secondary"] = hex_colors[1]
        
        return colors
    
    def _estimate_email_type(self, html: str) -> str:
        """Estima tipo do email baseado no HTML"""
        
        html_lower = html.lower()
        
        if "bem-vindo" in html_lower or "welcome" in html_lower:
            return "welcome"
        elif "newsletter" in html_lower or "notícias" in html_lower:
            return "newsletter"
        elif "oferta" in html_lower or "desconto" in html_lower:
            return "promotional"
        else:
            return "general"
    
    def _generate_fallback_email(
        self,
        prompt: str,
        industry: str,
        tone: str
    ) -> Dict[str, Any]:
        """Gera email de fallback em caso de erro"""
        
        industry_config = self.industry_templates.get(industry, self.industry_templates["geral"])
        
        fallback_html = f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email Gerado por IA</title>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f4f4f4; }}
        .container {{ max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 40px; }}
        .header {{ background: {industry_config['colors']['gradient']}; color: white; padding: 20px; text-align: center; border-radius: 8px; margin-bottom: 30px; }}
        .cta {{ background: {industry_config['colors']['primary']}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>{industry_config['icon']} Email Gerado por IA</h1>
        </div>
        <p>Baseado em: <em>"{prompt[:100]}{'...' if len(prompt) > 100 else ''}"</em></p>
        <p>Seu email foi gerado automaticamente com nossos templates modernos.</p>
        <a href="#" class="cta">{industry_config['cta_options'][0]}</a>
        <p style="color: #666; font-size: 12px; margin-top: 30px;">Gerado pelo MailTrendz - Sistema de IA</p>
    </div>
</body>
</html>"""
        
        return {
            "subject": f"{industry_config['icon']} Email Gerado por IA",
            "preview_text": "Conteúdo criado automaticamente",
            "html": fallback_html,
            "text": f"Email baseado em: {prompt}\n\nConteúdo gerado automaticamente.",
            "metadata": {
                "generator": "fallback-generator",
                "quality_score": 75,
                "features": ["fallback-template"]
            }
        }
