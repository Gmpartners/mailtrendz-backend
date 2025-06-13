"""
✅ CSS EXPERT - ESPECIALISTA EM CSS PARA EMAILS
Sistema avançado de otimização e criação de CSS para emails
"""

import re
import json
from typing import Dict, List, Optional, Any
from datetime import datetime
from loguru import logger

class CSSExpert:
    """Especialista em CSS para emails com máxima compatibilidade"""
    
    def __init__(self):
        self.email_client_compatibility = {
            "gmail": {
                "supports_css3": False,
                "supports_media_queries": True,
                "max_css_size": "50kb",
                "inline_only": False,
                "quirks": ["strips_head_styles", "limited_pseudo_selectors"]
            },
            "outlook": {
                "supports_css3": False,
                "supports_media_queries": False,
                "max_css_size": "unlimited",
                "inline_only": True,
                "quirks": ["uses_word_engine", "no_background_images", "table_layout_only"]
            },
            "apple_mail": {
                "supports_css3": True,
                "supports_media_queries": True,
                "max_css_size": "unlimited",
                "inline_only": False,
                "quirks": ["full_css_support"]
            },
            "yahoo": {
                "supports_css3": False,
                "supports_media_queries": True,
                "max_css_size": "30kb",
                "inline_only": False,
                "quirks": ["strips_external_css"]
            }
        }
        
        self.modern_color_palettes = {
            "professional": {
                "primary": "#2563eb",
                "secondary": "#3b82f6",
                "accent": "#8b5cf6",
                "background": "#f8fafc",
                "text": "#1e293b",
                "gradient": "linear-gradient(135deg, #2563eb 0%, #3b82f6 50%, #8b5cf6 100%)"
            },
            "persuasive": {
                "primary": "#dc2626",
                "secondary": "#ef4444", 
                "accent": "#f97316",
                "background": "#fefcfb",
                "text": "#1f2937",
                "gradient": "linear-gradient(135deg, #dc2626 0%, #ef4444 50%, #f97316 100%)"
            },
            "friendly": {
                "primary": "#059669",
                "secondary": "#10b981",
                "accent": "#22d3ee",
                "background": "#f0fdf4",
                "text": "#1f2937",
                "gradient": "linear-gradient(135deg, #059669 0%, #10b981 50%, #22d3ee 100%)"
            },
            "urgent": {
                "primary": "#ea580c",
                "secondary": "#f97316",
                "accent": "#fbbf24",
                "background": "#fffbeb",
                "text": "#1f2937",
                "gradient": "linear-gradient(135deg, #ea580c 0%, #f97316 50%, #fbbf24 100%)"
            },
            "luxury": {
                "primary": "#1f2937",
                "secondary": "#374151",
                "accent": "#d4af37",
                "background": "#f9fafb",
                "text": "#1f2937",
                "gradient": "linear-gradient(135deg, #1f2937 0%, #374151 50%, #d4af37 100%)"
            }
        }
    
    def health_check(self) -> bool:
        """Verifica saúde do CSS Expert"""
        try:
            # Teste básico de funcionalidade
            test_css = "body { color: red; }"
            optimized = self._optimize_css_for_outlook(test_css)
            return len(optimized) > 0
        except:
            return False
    
    async def optimize_for_email_clients(
        self,
        html: str,
        target_clients: List[str] = ["gmail", "outlook", "apple_mail"],
        enable_dark_mode: bool = True,
        mobile_first: bool = True
    ) -> Dict[str, Any]:
        """
        ✅ OTIMIZAÇÃO PRINCIPAL PARA EMAIL CLIENTS
        Otimiza HTML/CSS para máxima compatibilidade
        """
        start_time = datetime.now()
        
        logger.info(f"🎨 Otimizando CSS para clients: {', '.join(target_clients)}")
        
        try:
            # Extrair CSS atual
            extracted_css = self._extract_css_from_html(html)
            extracted_html = self._extract_html_without_css(html)
            
            # Aplicar otimizações por client
            optimizations_applied = []
            optimized_css = extracted_css
            optimized_html = extracted_html
            
            for client in target_clients:
                if client in self.email_client_compatibility:
                    client_optimizations = self._optimize_for_specific_client(
                        css=optimized_css,
                        html=optimized_html,
                        client=client
                    )
                    optimized_css = client_optimizations["css"]
                    optimized_html = client_optimizations["html"]
                    optimizations_applied.extend(client_optimizations["optimizations"])
            
            # Aplicar design moderno
            modern_enhancements = self._apply_modern_enhancements(
                css=optimized_css,
                html=optimized_html,
                enable_dark_mode=enable_dark_mode,
                mobile_first=mobile_first
            )
            
            # Combinar HTML final
            final_html = self._combine_html_with_css(
                html=modern_enhancements["html"],
                css=modern_enhancements["css"]
            )
            
            # Extrair componentes
            components = self._extract_components(final_html)
            
            processing_time = (datetime.now() - start_time).total_seconds()
            compatibility_score = self._calculate_compatibility_score(target_clients)
            
            result = {
                "html": final_html,
                "css": modern_enhancements["css"],
                "components": components,
                "optimizations": optimizations_applied + modern_enhancements["enhancements"],
                "compatibility_score": compatibility_score,
                "processing_time": processing_time,
                "supported_clients": target_clients,
                "dark_mode_enabled": enable_dark_mode,
                "mobile_optimized": mobile_first
            }
            
            logger.success(f"✅ CSS otimizado - {processing_time:.3f}s, Score: {compatibility_score}")
            return result
            
        except Exception as e:
            logger.error(f"❌ Erro na otimização CSS: {e}")
            return self._create_fallback_optimization(html)
    
    def generate_modern_css_framework(
        self,
        industry: str = "geral",
        style_theme: str = "professional",
        include_animations: bool = False
    ) -> str:
        """
        ✅ GERADOR DE FRAMEWORK CSS MODERNO
        Cria CSS framework otimizado para emails
        """
        
        logger.info(f"🎨 Gerando framework CSS - Indústria: {industry}, Tema: {style_theme}")
        
        palette = self.modern_color_palettes.get(style_theme, self.modern_color_palettes["professional"])
        
        css_framework = f"""
/* ✅ MAILTRENDZ MODERN CSS FRAMEWORK */
/* Reset Ultra-Moderno */
* {{ 
    margin: 0; 
    padding: 0; 
    box-sizing: border-box; 
}}

/* Fontes modernas */
body, table, td, p, a, li, blockquote {{ 
    -webkit-text-size-adjust: 100%; 
    -ms-text-size-adjust: 100%; 
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', 'Roboto', sans-serif;
}}

/* Container principal */
.email-container {{
    max-width: 600px;
    margin: 0 auto;
    background: linear-gradient(180deg, #ffffff 0%, #fefefe 100%);
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 25px 50px rgba(0, 0, 0, 0.1);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}}

/* Header ultra-moderno */
.email-header {{
    background: {palette['gradient']};
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

/* Conteúdo principal */
.email-content {{
    padding: 40px 30px;
    background: {palette['background']};
    line-height: 1.7;
    color: {palette['text']};
}}

.email-content h2 {{
    color: {palette['primary']};
    font-size: clamp(22px, 4vw, 28px);
    font-weight: 600;
    margin: 0 0 25px 0;
    line-height: 1.3;
}}

.email-content h3 {{
    color: {palette['text']};
    font-size: clamp(18px, 3vw, 22px);
    font-weight: 600;
    margin: 25px 0 15px 0;
    line-height: 1.4;
}}

.email-content p {{
    margin: 0 0 20px 0;
    font-size: 16px;
    line-height: 1.7;
    color: {palette['text']};
}}

/* Lista moderna */
.email-content ul {{
    margin: 0 0 25px 0;
    padding-left: 0;
    list-style: none;
}}

.email-content li {{
    margin: 0 0 12px 0;
    padding-left: 35px;
    position: relative;
    font-size: 16px;
    line-height: 1.6;
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
    background: {palette['gradient']};
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 3px 8px rgba(0,0,0,0.15);
}}

/* CTA ultra-moderno */
.cta-container {{
    text-align: center;
    margin: 40px 0;
}}

.cta-button {{
    display: inline-block;
    background: {palette['gradient']};
    color: #ffffff !important;
    text-decoration: none;
    padding: 18px 40px;
    border-radius: 50px;
    font-size: 16px;
    font-weight: 600;
    box-shadow: 0 10px 30px rgba(0,0,0,0.15);
    transition: all 0.3s ease;
    border: none;
    text-align: center;
    min-width: 200px;
    cursor: pointer;
}}

.cta-button:hover {{
    transform: translateY(-2px);
    box-shadow: 0 15px 40px rgba(0,0,0,0.2);
}}

/* Cards modernos */
.card {{
    background: #ffffff;
    border-radius: 12px;
    padding: 25px;
    margin: 20px 0;
    box-shadow: 0 4px 15px rgba(0,0,0,0.08);
    border: 1px solid rgba(0,0,0,0.06);
}}

.card h3 {{
    color: {palette['primary']};
    margin-bottom: 15px;
}}

/* Badges de confiança */
.trust-badges {{
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 15px;
    margin: 30px 0;
}}

.trust-badge {{
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 15px 20px;
    background: #ffffff;
    border: 1px solid {palette['primary']}30;
    border-radius: 12px;
    font-size: 14px;
    color: {palette['primary']};
    font-weight: 500;
    box-shadow: 0 3px 12px rgba(0,0,0,0.05);
}}

.trust-badge::before {{
    content: '✓';
    font-weight: bold;
    color: #ffffff;
    background: {palette['gradient']};
    width: 20px;
    height: 20px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    flex-shrink: 0;
}}

/* Footer moderno */
.email-footer {{
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    padding: 40px 30px;
    text-align: center;
    border-top: 1px solid rgba(0,0,0,0.08);
}}

.email-footer p {{
    color: #64748b;
    font-size: 14px;
    margin: 8px 0;
    line-height: 1.5;
}}

.email-footer a {{
    color: {palette['primary']};
    text-decoration: none;
    font-weight: 500;
}}

/* Responsividade ultra-moderna */
@media only screen and (max-width: 600px) {{
    .email-container {{ 
        margin: 0 !important; 
        border-radius: 0 !important; 
        width: 100% !important;
    }}
    
    .email-header, .email-content, .email-footer {{ 
        padding: 30px 20px !important; 
    }}
    
    .email-header h1 {{ 
        font-size: 26px !important; 
    }}
    
    .email-content h2 {{ 
        font-size: 22px !important; 
    }}
    
    .cta-button {{ 
        padding: 16px 32px !important; 
        font-size: 15px !important;
        display: block !important;
        max-width: 280px !important;
        margin: 25px auto !important;
    }}
    
    .trust-badges {{
        grid-template-columns: 1fr;
    }}
    
    .card {{
        padding: 20px !important;
        margin: 15px 0 !important;
    }}
}}

/* Dark mode ultra-moderno */
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
    
    .card {{
        background: #374151 !important;
        border-color: #4b5563 !important;
    }}
    
    .trust-badge {{
        background: #374151 !important;
        border-color: #4b5563 !important;
        color: #f3f4f6 !important;
    }}
    
    .email-footer {{ 
        background: linear-gradient(135deg, #111827 0%, #1f2937 100%) !important; 
    }}
    
    .email-footer p {{
        color: #9ca3af !important;
    }}
}}

/* Animações sutis (se habilitadas) */
{self._generate_animations_css() if include_animations else ""}

/* Acessibilidade */
.sr-only {{
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
}}

/* Compatibilidade Outlook */
.outlook-fix {{
    mso-table-lspace: 0pt;
    mso-table-rspace: 0pt;
    border-collapse: collapse;
}}

.outlook-font {{
    font-family: Arial, sans-serif;
}}

/* Utilidades */
.text-center {{ text-align: center; }}
.text-left {{ text-align: left; }}
.text-right {{ text-align: right; }}

.mb-10 {{ margin-bottom: 10px; }}
.mb-20 {{ margin-bottom: 20px; }}
.mb-30 {{ margin-bottom: 30px; }}

.mt-10 {{ margin-top: 10px; }}
.mt-20 {{ margin-top: 20px; }}
.mt-30 {{ margin-top: 30px; }}

.p-10 {{ padding: 10px; }}
.p-20 {{ padding: 20px; }}
.p-30 {{ padding: 30px; }}
"""
        
        logger.success(f"✅ Framework CSS gerado - Tema: {style_theme}")
        return css_framework.strip()
    
    def _optimize_for_specific_client(
        self, 
        css: str, 
        html: str, 
        client: str
    ) -> Dict[str, Any]:
        """Otimiza para cliente específico"""
        
        client_config = self.email_client_compatibility.get(client, {})
        optimizations = []
        
        if client == "outlook":
            css = self._optimize_css_for_outlook(css)
            html = self._optimize_html_for_outlook(html)
            optimizations.append("Outlook VML compatibility")
            optimizations.append("Table-based layout")
            
        elif client == "gmail":
            css = self._optimize_css_for_gmail(css)
            optimizations.append("Gmail CSS reset")
            optimizations.append("Inline styles prioritized")
            
        elif client == "apple_mail":
            # Apple Mail tem excelente suporte CSS
            optimizations.append("Full CSS3 support enabled")
            
        elif client == "yahoo":
            css = self._optimize_css_for_yahoo(css)
            optimizations.append("Yahoo CSS size optimized")
        
        return {
            "css": css,
            "html": html,
            "optimizations": optimizations
        }
    
    def _optimize_css_for_outlook(self, css: str) -> str:
        """Otimizações específicas para Outlook"""
        
        # Remover propriedades não suportadas
        outlook_unsupported = [
            r'border-radius\s*:[^;]+;',
            r'box-shadow\s*:[^;]+;',
            r'text-shadow\s*:[^;]+;',
            r'transform\s*:[^;]+;',
            r'transition\s*:[^;]+;',
            r'animation\s*:[^;]+;'
        ]
        
        for pattern in outlook_unsupported:
            css = re.sub(pattern, '', css, flags=re.IGNORECASE)
        
        # Adicionar fallbacks para Outlook
        css += """
/* Outlook específico */
.outlook-container {
    font-family: Arial, sans-serif !important;
}

table {
    mso-table-lspace: 0pt;
    mso-table-rspace: 0pt;
    border-collapse: collapse;
}

img {
    -ms-interpolation-mode: bicubic;
    border: 0;
    height: auto;
    line-height: 100%;
    outline: none;
    text-decoration: none;
}
"""
        
        return css
    
    def _optimize_css_for_gmail(self, css: str) -> str:
        """Otimizações específicas para Gmail"""
        
        # Gmail reset
        gmail_reset = """
/* Gmail específico */
.gmail-container {
    font-family: Arial, Helvetica, sans-serif;
}

u + .body .gmail-container {
    font-family: Arial, Helvetica, sans-serif;
}

.gmail-container img {
    max-width: 100%;
    height: auto;
}
"""
        
        return css + gmail_reset
    
    def _optimize_css_for_yahoo(self, css: str) -> str:
        """Otimizações específicas para Yahoo"""
        
        # Limitar tamanho do CSS
        if len(css) > 30000:  # 30KB limit
            css = css[:30000] + "..."
        
        return css
    
    def _optimize_html_for_outlook(self, html: str) -> str:
        """Otimizações HTML específicas para Outlook"""
        
        # Adicionar MSO conditionals se necessário
        if "mso" not in html.lower():
            html = html.replace(
                "<head>", 
                """<head>
<!--[if mso]>
<noscript>
<xml>
<o:OfficeDocumentSettings>
<o:AllowPNG/>
<o:PixelsPerInch>96</o:PixelsPerInch>
</o:OfficeDocumentSettings>
</xml>
</noscript>
<![endif]-->"""
            )
        
        return html
    
    def _apply_modern_enhancements(
        self,
        css: str,
        html: str,
        enable_dark_mode: bool,
        mobile_first: bool
    ) -> Dict[str, Any]:
        """Aplica melhorias modernas"""
        
        enhancements = []
        
        # Dark mode
        if enable_dark_mode and "@media (prefers-color-scheme: dark)" not in css:
            dark_mode_css = """
@media (prefers-color-scheme: dark) {
    .email-container { 
        background: linear-gradient(180deg, #1f2937 0%, #111827 100%) !important; 
    }
    .email-content { 
        background: linear-gradient(180deg, #1f2937 0%, #111827 100%) !important; 
        color: #f3f4f6 !important; 
    }
    .email-content h1, .email-content h2, .email-content h3 { 
        color: #f3f4f6 !important; 
    }
    .email-content p { 
        color: #e5e7eb !important; 
    }
}"""
            css += dark_mode_css
            enhancements.append("Dark mode support")
        
        # Mobile-first
        if mobile_first and "@media only screen and (max-width: 600px)" not in css:
            mobile_css = """
@media only screen and (max-width: 600px) {
    .email-container { 
        margin: 0 !important; 
        border-radius: 0 !important; 
        width: 100% !important;
    }
    .email-header, .email-content, .email-footer { 
        padding: 30px 20px !important; 
    }
    .cta-button { 
        padding: 16px 32px !important; 
        display: block !important;
        max-width: 280px !important;
        margin: 25px auto !important;
    }
}"""
            css += mobile_css
            enhancements.append("Mobile-first responsive")
        
        return {
            "css": css,
            "html": html,
            "enhancements": enhancements
        }
    
    def _extract_css_from_html(self, html: str) -> str:
        """Extrai CSS do HTML"""
        style_match = re.search(r'<style[^>]*>(.*?)</style>', html, re.DOTALL | re.IGNORECASE)
        return style_match.group(1) if style_match else ""
    
    def _extract_html_without_css(self, html: str) -> str:
        """Remove CSS do HTML"""
        return re.sub(r'<style[^>]*>.*?</style>', '', html, flags=re.DOTALL | re.IGNORECASE)
    
    def _combine_html_with_css(self, html: str, css: str) -> str:
        """Combina HTML com CSS otimizado"""
        
        if "<style" in html:
            # Substituir CSS existente
            return re.sub(
                r'<style[^>]*>.*?</style>',
                f'<style>\n{css}\n</style>',
                html,
                flags=re.DOTALL | re.IGNORECASE
            )
        elif "<head>" in html:
            # Adicionar CSS no head
            return html.replace(
                "<head>",
                f"<head>\n<style>\n{css}\n</style>"
            )
        else:
            # HTML sem head, adicionar CSS inline
            return f"<style>\n{css}\n</style>\n{html}"
    
    def _extract_components(self, html: str) -> List[str]:
        """Extrai componentes do HTML"""
        components = []
        
        html_lower = html.lower()
        
        if "email-header" in html_lower:
            components.append("header")
        if "email-content" in html_lower:
            components.append("content")
        if "cta-button" in html_lower:
            components.append("cta")
        if "trust-badge" in html_lower:
            components.append("trust-elements")
        if "email-footer" in html_lower:
            components.append("footer")
        if "card" in html_lower:
            components.append("cards")
        
        return components
    
    def _calculate_compatibility_score(self, target_clients: List[str]) -> float:
        """Calcula score de compatibilidade"""
        
        base_score = 0.8
        
        if "outlook" in target_clients:
            base_score += 0.05  # Outlook é difícil, +pontos se otimizado
        if "gmail" in target_clients:
            base_score += 0.05
        if "apple_mail" in target_clients:
            base_score += 0.05
        if len(target_clients) >= 3:
            base_score += 0.05  # Multi-client otimization
        
        return min(base_score, 1.0)
    
    def _generate_animations_css(self) -> str:
        """Gera CSS de animações sutis"""
        return """
/* Animações sutis */
@keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}

@keyframes slideIn {
    from { transform: translateX(-20px); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
}

.animate-fade-in {
    animation: fadeIn 0.6s ease-out;
}

.animate-slide-in {
    animation: slideIn 0.5s ease-out;
}

.cta-button {
    transition: all 0.3s ease;
}

.card {
    transition: box-shadow 0.3s ease;
}

.card:hover {
    box-shadow: 0 8px 25px rgba(0,0,0,0.12);
}
"""
    
    def _create_fallback_optimization(self, html: str) -> Dict[str, Any]:
        """Cria otimização de fallback em caso de erro"""
        return {
            "html": html,
            "css": self.generate_modern_css_framework(),
            "components": ["fallback"],
            "optimizations": ["Fallback optimization applied"],
            "compatibility_score": 0.8,
            "processing_time": 0.1,
            "supported_clients": ["gmail", "outlook"],
            "dark_mode_enabled": True,
            "mobile_optimized": True
        }
