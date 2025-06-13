"""
✅ MODERN TEMPLATE ENGINE - MOTOR DE TEMPLATES ULTRA-MODERNOS
Sistema avançado de templates para emails de alta conversão
"""

from typing import Dict, List, Optional, Any
from jinja2 import Template, Environment, BaseLoader
from loguru import logger


class ModernTemplateEngine:
    """
    Motor de templates modernos para emails
    """
    
    def __init__(self):
        self.env = Environment(loader=BaseLoader())
        
        # Templates ultra-modernos base
        self.base_templates = {
            "ultra_modern": self._get_ultra_modern_template(),
            "minimal_premium": self._get_minimal_premium_template(),
            "corporate_elegant": self._get_corporate_elegant_template(),
            "creative_dynamic": self._get_creative_dynamic_template()
        }
        
        # Configurações de estilo por indústria
        self.industry_styles = {
            "saude": {
                "template": "ultra_modern",
                "primary_color": "#059669",
                "accent_color": "#10b981",
                "font_family": "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                "border_radius": "12px"
            },
            "tecnologia": {
                "template": "creative_dynamic", 
                "primary_color": "#2563eb",
                "accent_color": "#3b82f6",
                "font_family": "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                "border_radius": "8px"
            },
            "educacao": {
                "template": "corporate_elegant",
                "primary_color": "#8b5cf6",
                "accent_color": "#a78bfa",
                "font_family": "'Poppins', -apple-system, BlinkMacSystemFont, sans-serif", 
                "border_radius": "16px"
            },
            "ecommerce": {
                "template": "ultra_modern",
                "primary_color": "#16a34a",
                "accent_color": "#22c55e",
                "font_family": "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                "border_radius": "10px"
            },
            "geral": {
                "template": "minimal_premium",
                "primary_color": "#6366f1", 
                "accent_color": "#8b5cf6",
                "font_family": "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                "border_radius": "12px"
            }
        }
    
    def apply_ultra_modern_template(
        self,
        content: str,
        subject: str,
        config: Dict[str, Any]
    ) -> str:
        """
        ✅ MÉTODO PRINCIPAL: Aplica template ultra-moderno
        """
        try:
            logger.info(f"🎨 Aplicando template ultra-moderno - Indústria: {config.get('industry', 'geral')}")
            
            # Determinar estilo baseado na indústria
            industry = config.get("industry", "geral")
            industry_style = self.industry_styles.get(industry, self.industry_styles["geral"])
            
            # Selecionar template base
            template_name = industry_style["template"]
            base_template = self.base_templates[template_name]
            
            # Preparar variáveis do template
            template_vars = self._prepare_template_variables(
                content=content,
                subject=subject,
                config=config,
                industry_style=industry_style
            )
            
            # Renderizar template
            template = Template(base_template)
            rendered_html = template.render(**template_vars)
            
            # Aplicar otimizações finais
            optimized_html = self._apply_final_optimizations(rendered_html, config)
            
            logger.success(f"✅ Template aplicado - {len(optimized_html)} caracteres")
            
            return optimized_html
            
        except Exception as e:
            logger.error(f"❌ Erro ao aplicar template: {e}")
            return self._generate_fallback_template(content, subject, config)
    
    def _prepare_template_variables(
        self,
        content: str,
        subject: str,
        config: Dict[str, Any],
        industry_style: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Prepara variáveis para o template
        """
        try:
            # Combinar configurações
            combined_config = {**industry_style, **config}
            
            # Detectar elementos de urgência
            urgency_level = config.get("urgency", "medium")
            urgency_elements = self._get_urgency_elements(urgency_level)
            
            # Preparar elementos de confiança
            trust_elements = config.get("trust_elements", [
                "Qualidade garantida",
                "Atendimento especializado",
                "Resultados comprovados"
            ])
            
            # Preparar CTA
            cta_text = config.get("cta_text", "Saiba Mais")
            cta_style = self._generate_cta_style(combined_config, urgency_level)
            
            # Preparar gradientes
            header_gradient = self._generate_header_gradient(
                combined_config["primary_color"],
                combined_config["accent_color"]
            )
            
            variables = {
                # Conteúdo
                "subject": subject,
                "content": content,
                "preview_text": f"{subject} - Conteúdo premium criado especialmente para você",
                
                # Estilo
                "primary_color": combined_config["primary_color"],
                "accent_color": combined_config["accent_color"],
                "font_family": combined_config["font_family"],
                "border_radius": combined_config["border_radius"],
                "header_gradient": header_gradient,
                
                # Elementos dinâmicos
                "cta_text": cta_text,
                "cta_style": cta_style,
                "trust_elements": trust_elements,
                "urgency_elements": urgency_elements,
                
                # Configurações
                "industry": config.get("industry", "geral"),
                "tone": config.get("tone", "professional"),
                "icon": config.get("icon", "✨"),
                
                # Responsividade
                "container_width": "600px",
                "mobile_padding": "20px 15px",
                "desktop_padding": "40px 30px",
                
                # Dark mode
                "dark_mode_enabled": True,
                "dark_bg_color": "#1f2937",
                "dark_text_color": "#f3f4f6"
            }
            
            return variables
            
        except Exception as e:
            logger.error(f"❌ Erro ao preparar variáveis: {e}")
            return {
                "subject": subject,
                "content": content,
                "primary_color": "#6366f1",
                "accent_color": "#8b5cf6",
                "cta_text": "Saiba Mais"
            }
    
    def _get_urgency_elements(self, urgency_level: str) -> Dict[str, Any]:
        """
        Gera elementos de urgência baseado no nível
        """
        urgency_configs = {
            "high": {
                "badge": "🔥 OFERTA LIMITADA",
                "badge_color": "#dc2626",
                "countdown_text": "⏰ Expira em breve!",
                "emphasis_style": "font-weight: 800; color: #dc2626; text-transform: uppercase;",
                "show_countdown": True
            },
            "medium": {
                "badge": "⭐ OFERTA ESPECIAL",
                "badge_color": "#d97706", 
                "countdown_text": "📅 Por tempo limitado",
                "emphasis_style": "font-weight: 600; color: #d97706;",
                "show_countdown": False
            },
            "low": {
                "badge": "",
                "badge_color": "#6b7280",
                "countdown_text": "",
                "emphasis_style": "font-weight: 500;",
                "show_countdown": False
            }
        }
        
        return urgency_configs.get(urgency_level, urgency_configs["medium"])
    
    def _generate_cta_style(self, config: Dict[str, Any], urgency: str) -> str:
        """
        Gera estilo do CTA baseado na configuração
        """
        base_style = f"""
            display: inline-block;
            background: linear-gradient(135deg, {config['primary_color']} 0%, {config['accent_color']} 100%);
            color: #ffffff !important;
            text-decoration: none;
            padding: 18px 36px;
            border-radius: {config['border_radius']};
            font-family: {config['font_family']};
            font-weight: 700;
            font-size: 16px;
            box-shadow: 0 8px 25px rgba(0,0,0,0.15);
            transition: all 0.3s ease;
            border: none;
            text-align: center;
            min-width: 200px;
            letter-spacing: 0.5px;
        """
        
        if urgency == "high":
            base_style += """
            animation: pulse 2s infinite;
            box-shadow: 0 0 20px rgba(220, 38, 38, 0.4);
            """
        
        return base_style.strip()
    
    def _generate_header_gradient(self, primary: str, accent: str) -> str:
        """
        Gera gradiente para o header
        """
        return f"linear-gradient(135deg, {primary} 0%, {accent} 50%, {primary} 100%)"
    
    def _get_ultra_modern_template(self) -> str:
        """
        Template ultra-moderno principal
        """
        return """
<!DOCTYPE html>
<html lang="pt-BR" xmlns="http://www.w3.org/1999/xhtml">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no">
    <meta name="color-scheme" content="light dark">
    <meta name="supported-color-schemes" content="light dark">
    <title>{{ subject }}</title>
    
    <style>
        /* ✅ RESET ULTRA-MODERNO */
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body, table, td, p, a, li, blockquote { 
            -webkit-text-size-adjust: 100%; 
            -ms-text-size-adjust: 100%; 
            font-family: {{ font_family }};
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }
        
        table, td { 
            mso-table-lspace: 0pt; 
            mso-table-rspace: 0pt; 
            border-collapse: collapse;
        }
        
        img { 
            -ms-interpolation-mode: bicubic; 
            border: 0; 
            max-width: 100%;
            height: auto;
            display: block;
        }
        
        /* ✅ CONTAINER ULTRA-MODERNO */
        .ultra-email-container {
            max-width: {{ container_width }};
            margin: 0 auto;
            background: linear-gradient(180deg, #ffffff 0%, #fefefe 100%);
            border-radius: {{ border_radius }};
            overflow: hidden;
            box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
            font-family: {{ font_family }};
            position: relative;
        }
        
        /* ✅ HEADER ULTRA-MODERNO */
        .ultra-email-header {
            background: {{ header_gradient }};
            padding: {{ desktop_padding }};
            text-align: center;
            position: relative;
            overflow: hidden;
        }
        
        .ultra-email-header::before {
            content: '';
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle at 30% 20%, rgba(255,255,255,0.2) 0%, transparent 50%);
            pointer-events: none;
        }
        
        .ultra-email-header h1 {
            color: #ffffff;
            font-size: clamp(24px, 5vw, 32px);
            font-weight: 800;
            margin: 0;
            text-shadow: 0 4px 12px rgba(0,0,0,0.3);
            position: relative;
            z-index: 2;
            line-height: 1.2;
        }
        
        .header-decoration {
            position: absolute;
            top: 20px;
            right: 30px;
            font-size: 60px;
            opacity: 0.2;
            z-index: 1;
        }
        
        /* ✅ CONTEÚDO ULTRA-ESTRUTURADO */
        .ultra-email-content {
            padding: {{ desktop_padding }};
            background: linear-gradient(180deg, #ffffff 0%, #fafbfc 100%);
            line-height: 1.8;
            color: #1e293b;
            position: relative;
        }
        
        .ultra-email-content h2 {
            color: {{ primary_color }};
            font-size: clamp(20px, 4vw, 28px);
            font-weight: 700;
            margin: 0 0 25px 0;
            line-height: 1.3;
        }
        
        .ultra-email-content h3 {
            color: #1e293b;
            font-size: clamp(18px, 3vw, 24px);
            font-weight: 600;
            margin: 30px 0 20px 0;
            line-height: 1.4;
        }
        
        .ultra-email-content p {
            margin: 0 0 20px 0;
            font-size: 16px;
            line-height: 1.7;
        }
        
        .ultra-email-content ul {
            margin: 0 0 30px 0;
            padding-left: 0;
            list-style: none;
        }
        
        .ultra-email-content li {
            margin: 0 0 15px 0;
            padding-left: 40px;
            position: relative;
            font-size: 16px;
            line-height: 1.6;
        }
        
        .ultra-email-content li::before {
            content: '✓';
            position: absolute;
            left: 0;
            top: 2px;
            color: #ffffff;
            font-weight: bold;
            font-size: 14px;
            width: 28px;
            height: 28px;
            background: linear-gradient(135deg, {{ primary_color }} 0%, {{ accent_color }} 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        
        /* ✅ CTA ULTRA-MODERNO */
        .ultra-cta-container {
            text-align: center;
            margin: 40px 0;
        }
        
        .ultra-cta-button {
            {{ cta_style }}
        }
        
        .ultra-cta-button:hover {
            transform: translateY(-2px) scale(1.02);
            box-shadow: 0 12px 35px rgba(0,0,0,0.2);
        }
        
        /* ✅ URGÊNCIA */
        {% if urgency_elements.show_countdown %}
        .urgency-badge {
            background: {{ urgency_elements.badge_color }};
            color: #ffffff;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            display: inline-block;
            margin-bottom: 20px;
            animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.8; transform: scale(1.05); }
        }
        {% endif %}
        
        /* ✅ ELEMENTOS DE CONFIANÇA */
        .trust-section {
            margin: 35px 0;
            padding: 30px;
            background: linear-gradient(135deg, #f8fafc 0%, rgba(255,255,255,0.9) 100%);
            border-radius: {{ border_radius }};
            border: 1px solid rgba({{ primary_color.replace('#', '') }}, 0.1);
        }
        
        .trust-badges {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
            gap: 15px;
            margin: 25px 0;
        }
        
        .trust-badge {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 15px 18px;
            background: #ffffff;
            border: 1px solid {{ primary_color }}30;
            border-radius: {{ border_radius }};
            font-size: 14px;
            color: {{ primary_color }};
            font-weight: 500;
            box-shadow: 0 3px 12px rgba(0,0,0,0.05);
        }
        
        .trust-badge::before {
            content: '✓';
            font-weight: bold;
            color: #ffffff;
            background: linear-gradient(135deg, {{ primary_color }} 0%, {{ accent_color }} 100%);
            width: 20px;
            height: 20px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 11px;
        }
        
        /* ✅ FOOTER MODERNO */
        .ultra-email-footer {
            background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
            padding: {{ desktop_padding }};
            text-align: center;
            border-top: 1px solid rgba(0,0,0,0.08);
        }
        
        .ultra-email-footer p {
            color: #64748b;
            font-size: 14px;
            margin: 8px 0;
            line-height: 1.5;
        }
        
        .ultra-email-footer a {
            color: {{ primary_color }};
            text-decoration: none;
            font-weight: 500;
        }
        
        .branding-logo {
            font-size: 20px;
            font-weight: 700;
            background: {{ header_gradient }};
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 10px;
        }
        
        /* ✅ RESPONSIVIDADE */
        @media only screen and (max-width: 600px) {
            .ultra-email-container { 
                margin: 0 !important; 
                border-radius: 0 !important; 
                width: 100% !important;
            }
            
            .ultra-email-header, .ultra-email-content, .ultra-email-footer { 
                padding: {{ mobile_padding }} !important; 
            }
            
            .ultra-email-header h1 { 
                font-size: 24px !important; 
            }
            
            .ultra-cta-button { 
                display: block !important;
                max-width: 280px !important;
                margin: 25px auto !important;
                padding: 16px 24px !important;
            }
            
            .trust-badges {
                grid-template-columns: 1fr;
            }
        }
        
        /* ✅ DARK MODE */
        {% if dark_mode_enabled %}
        @media (prefers-color-scheme: dark) {
            .ultra-email-container { 
                background: linear-gradient(180deg, {{ dark_bg_color }} 0%, #111827 100%) !important; 
            }
            .ultra-email-content { 
                background: linear-gradient(180deg, {{ dark_bg_color }} 0%, #111827 100%) !important; 
                color: {{ dark_text_color }} !important; 
            }
            .ultra-email-content h2, .ultra-email-content h3 { 
                color: {{ dark_text_color }} !important; 
            }
            .ultra-email-footer { 
                background: linear-gradient(135deg, #111827 0%, {{ dark_bg_color }} 100%) !important; 
            }
        }
        {% endif %}
    </style>
</head>
<body style="margin: 0; padding: 15px; font-family: {{ font_family }}; background: #f8fafc;">
    
    <div class="ultra-email-container">
        <div class="ultra-email-header">
            <div class="header-decoration">{{ icon }}</div>
            <h1>{{ subject }}</h1>
        </div>
        
        <div class="ultra-email-content">
            {% if urgency_elements.badge %}
            <div class="urgency-badge">{{ urgency_elements.badge }}</div>
            {% endif %}
            
            {{ content }}
            
            <div class="ultra-cta-container">
                <a href="#" class="ultra-cta-button">{{ cta_text }}</a>
            </div>
            
            {% if trust_elements %}
            <div class="trust-section">
                <h3 style="text-align: center; margin-bottom: 20px; color: {{ primary_color }};">
                    {{ icon }} Por que confiar?
                </h3>
                <div class="trust-badges">
                    {% for element in trust_elements %}
                    <div class="trust-badge">{{ element }}</div>
                    {% endfor %}
                </div>
            </div>
            {% endif %}
        </div>
        
        <div class="ultra-email-footer">
            <div class="branding-logo">MailTrendz</div>
            <p><strong>Emails ultra-modernos de alta conversão</strong></p>
            <p>Criado com IA de última geração</p>
            
            <p style="margin-top: 20px; font-size: 12px;">
                <a href="#">Descadastrar</a> | 
                <a href="#">Política de Privacidade</a>
            </p>
        </div>
    </div>
    
</body>
</html>
        """
    
    def _get_minimal_premium_template(self) -> str:
        """
        Template minimalista premium
        """
        return """
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ subject }}</title>
    <style>
        body { 
            margin: 0; 
            padding: 20px; 
            font-family: {{ font_family }}; 
            background: #fafafa; 
            color: #333;
        }
        .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background: #ffffff; 
            border-radius: {{ border_radius }}; 
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }
        .header { 
            background: {{ primary_color }}; 
            color: #ffffff; 
            padding: 40px 30px; 
            text-align: center; 
        }
        .header h1 { 
            margin: 0; 
            font-size: 28px; 
            font-weight: 300; 
        }
        .content { 
            padding: 40px 30px; 
            line-height: 1.6; 
        }
        .cta-button { 
            {{ cta_style }}
        }
        .footer { 
            background: #f8f9fa; 
            padding: 30px; 
            text-align: center; 
            color: #666; 
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>{{ subject }}</h1>
        </div>
        <div class="content">
            {{ content }}
            <p style="text-align: center; margin: 30px 0;">
                <a href="#" class="cta-button">{{ cta_text }}</a>
            </p>
        </div>
        <div class="footer">
            <p>Email criado com MailTrendz</p>
        </div>
    </div>
</body>
</html>
        """
    
    def _get_corporate_elegant_template(self) -> str:
        """
        Template corporativo elegante
        """
        return self._get_minimal_premium_template()  # Por simplicidade, usar o mesmo
    
    def _get_creative_dynamic_template(self) -> str:
        """
        Template criativo e dinâmico
        """
        return self._get_ultra_modern_template()  # Por simplicidade, usar o ultra-moderno
    
    def _apply_final_optimizations(self, html: str, config: Dict[str, Any]) -> str:
        """
        Aplica otimizações finais no HTML
        """
        try:
            # Minificar CSS inline (preservando legibilidade)
            import re
            
            # Remover comentários CSS desnecessários
            html = re.sub(r'/\*[^*]*\*+(?:[^/*][^*]*\*+)*/', '', html)
            
            # Remover espaços extras em CSS
            html = re.sub(r'\s+', ' ', html)
            html = re.sub(r';\s*}', '}', html)
            
            return html
            
        except Exception as e:
            logger.error(f"❌ Erro nas otimizações finais: {e}")
            return html
    
    def _generate_fallback_template(
        self, 
        content: str, 
        subject: str, 
        config: Dict[str, Any]
    ) -> str:
        """
        Gera template de fallback quando tudo falha
        """
        logger.warning("🔄 Gerando template de fallback")
        
        return f"""
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{subject}</title>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f4f6f8; }}
        .container {{ max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; }}
        .header {{ background: #667eea; color: #ffffff; padding: 30px; text-align: center; }}
        .content {{ padding: 30px; line-height: 1.6; }}
        .cta {{ display: inline-block; background: #667eea; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; }}
        .footer {{ background: #f8f9fa; padding: 20px; text-align: center; color: #666; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>{subject}</h1>
        </div>
        <div class="content">
            {content}
            <p style="text-align: center;">
                <a href="#" class="cta">{config.get('cta_text', 'Saiba Mais')}</a>
            </p>
        </div>
        <div class="footer">
            <p>Email criado com MailTrendz</p>
        </div>
    </div>
</body>
</html>
        """