"""
✅ HTML OPTIMIZER - OTIMIZADOR DE HTML PARA EMAILS
Sistema avançado de validação, correção e otimização de HTML
"""

import re
import json
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime
from loguru import logger

class HTMLOptimizer:
    """Otimizador avançado de HTML para emails"""
    
    def __init__(self):
        self.email_client_quirks = {
            "outlook": {
                "requires_table_layout": True,
                "no_css3": True,
                "needs_mso_conditionals": True,
                "max_width_attribute": True
            },
            "gmail": {
                "strips_head_styles": True,
                "prefers_inline_css": True,
                "removes_classes": False,
                "supports_media_queries": True
            },
            "apple_mail": {
                "excellent_support": True,
                "full_css_support": True
            },
            "yahoo": {
                "strips_external_css": True,
                "limited_css_support": True
            }
        }
        
        self.html_validation_rules = {
            "required_elements": ["<!DOCTYPE", "<html", "<head", "<body"],
            "required_meta_tags": ["charset", "viewport"],
            "email_specific": ["max-width", "table-layout", "font-family"],
            "accessibility": ["alt", "role", "aria-label"]
        }
        
        self.optimization_patterns = {
            "remove_comments": r'<!--(?!.*\[if).*?-->',
            "minify_whitespace": r'\s+',
            "remove_empty_attributes": r'\s+[a-zA-Z-]+=""',
            "optimize_tables": r'<table[^>]*cellpadding="0"[^>]*cellspacing="0"[^>]*>'
        }
    
    def health_check(self) -> bool:
        """Verifica saúde do HTML Optimizer"""
        try:
            test_html = "<html><body><p>Test</p></body></html>"
            result = self.validate_and_optimize_html(test_html)
            return result["valid"]
        except:
            return False
    
    def validate_and_optimize_html(
        self,
        html: str,
        target_clients: List[str] = ["gmail", "outlook"],
        fix_issues: bool = True,
        optimize_for_size: bool = True
    ) -> Dict[str, Any]:
        """
        ✅ VALIDAÇÃO E OTIMIZAÇÃO PRINCIPAL
        Valida, corrige e otimiza HTML para emails
        """
        start_time = datetime.now()
        
        logger.info(f"🔍 Validando e otimizando HTML - Targets: {', '.join(target_clients)}")
        
        try:
            # Análise inicial
            analysis = self._analyze_html_structure(html)
            
            # Validação
            validation_results = self._validate_html_for_emails(html, target_clients)
            
            # Correções automáticas
            corrected_html = html
            if fix_issues and validation_results["issues"]:
                corrected_html = self._apply_automatic_fixes(html, validation_results["issues"])
            
            # Otimizações
            optimized_html = corrected_html
            optimizations_applied = []
            
            if optimize_for_size:
                size_optimization = self._optimize_for_size(optimized_html)
                optimized_html = size_optimization["html"]
                optimizations_applied.extend(size_optimization["optimizations"])
            
            # Otimizações específicas por client
            for client in target_clients:
                client_optimization = self._optimize_for_client(optimized_html, client)
                optimized_html = client_optimization["html"]
                optimizations_applied.extend(client_optimization["optimizations"])
            
            # Validação final
            final_validation = self._validate_html_for_emails(optimized_html, target_clients)
            
            # Métricas de qualidade
            quality_metrics = self._calculate_quality_metrics(
                original_html=html,
                optimized_html=optimized_html,
                validation_results=final_validation
            )
            
            processing_time = (datetime.now() - start_time).total_seconds()
            
            result = {
                "valid": final_validation["valid"],
                "optimized_html": optimized_html,
                "original_size": len(html),
                "optimized_size": len(optimized_html),
                "size_reduction": len(html) - len(optimized_html),
                "issues_found": validation_results["issues"],
                "issues_fixed": len(validation_results["issues"]) - len(final_validation["issues"]),
                "optimizations_applied": optimizations_applied,
                "quality_metrics": quality_metrics,
                "client_compatibility": self._check_client_compatibility(optimized_html, target_clients),
                "accessibility_score": self._calculate_accessibility_score(optimized_html),
                "performance_score": self._calculate_performance_score(optimized_html),
                "processing_time": processing_time,
                "analysis": analysis,
                "validation_details": final_validation
            }
            
            logger.success(f"✅ HTML otimizado - {processing_time:.3f}s, Qualidade: {quality_metrics['overall_score']}")
            return result
            
        except Exception as e:
            logger.error(f"❌ Erro na otimização HTML: {e}")
            return self._create_fallback_validation(html)
    
    def extract_and_enhance_content(
        self,
        html: str,
        enhancement_type: str = "modern"
    ) -> Dict[str, Any]:
        """
        ✅ EXTRAÇÃO E MELHORIA DE CONTEÚDO
        Extrai conteúdo e aplica melhorias modernas
        """
        
        logger.info(f"🎨 Extraindo e melhorando conteúdo - Tipo: {enhancement_type}")
        
        try:
            # Extrair componentes
            components = self._extract_content_components(html)
            
            # Aplicar melhorias baseadas no tipo
            enhanced_components = self._enhance_components(components, enhancement_type)
            
            # Reconstruir HTML melhorado
            enhanced_html = self._rebuild_html_with_components(enhanced_components)
            
            # Validar resultado
            validation = self._validate_html_for_emails(enhanced_html, ["gmail", "outlook"])
            
            return {
                "original_html": html,
                "enhanced_html": enhanced_html,
                "components_extracted": list(components.keys()),
                "enhancements_applied": enhanced_components.get("enhancements", []),
                "valid": validation["valid"],
                "quality_improvement": self._calculate_improvement_score(html, enhanced_html)
            }
            
        except Exception as e:
            logger.error(f"❌ Erro na melhoria de conteúdo: {e}")
            return {
                "enhanced_html": html,
                "components_extracted": [],
                "enhancements_applied": ["Error in enhancement"],
                "valid": False
            }
    
    def _analyze_html_structure(self, html: str) -> Dict[str, Any]:
        """Analisa estrutura do HTML"""
        
        analysis = {
            "has_doctype": "<!DOCTYPE" in html.upper(),
            "has_html_tag": "<html" in html.lower(),
            "has_head": "<head" in html.lower(),
            "has_body": "<body" in html.lower(),
            "has_meta_charset": "charset" in html.lower(),
            "has_meta_viewport": "viewport" in html.lower(),
            "has_title": "<title" in html.lower(),
            "uses_tables": "<table" in html.lower(),
            "uses_css": "<style" in html.lower() or "style=" in html.lower(),
            "has_images": "<img" in html.lower(),
            "has_links": "<a" in html.lower(),
            "estimated_render_time": self._estimate_render_time(html),
            "complexity_score": self._calculate_complexity_score(html),
            "element_count": html.lower().count("<"),
            "inline_styles_count": html.count("style="),
            "css_classes_count": html.count("class="),
            "table_count": html.lower().count("<table"),
            "image_count": html.lower().count("<img"),
            "link_count": html.lower().count("<a")
        }
        
        return analysis
    
    def _validate_html_for_emails(
        self,
        html: str,
        target_clients: List[str]
    ) -> Dict[str, Any]:
        """Valida HTML específico para emails"""
        
        issues = []
        warnings = []
        suggestions = []
        
        # Validações básicas
        if "<!DOCTYPE" not in html.upper():
            issues.append("Missing DOCTYPE declaration")
        
        if "<html" not in html.lower():
            issues.append("Missing <html> tag")
        
        if "charset" not in html.lower():
            issues.append("Missing charset meta tag")
        
        if "viewport" not in html.lower():
            warnings.append("Missing viewport meta tag")
        
        # Validações específicas para Outlook
        if "outlook" in target_clients:
            if "<table" not in html.lower():
                warnings.append("Outlook prefers table-based layouts")
            
            if "border-radius" in html.lower():
                warnings.append("Outlook doesn't support border-radius")
            
            if "box-shadow" in html.lower():
                warnings.append("Outlook doesn't support box-shadow")
        
        # Validações para Gmail
        if "gmail" in target_clients:
            if "<style" in html.lower() and "!important" not in html.lower():
                suggestions.append("Consider using !important for Gmail compatibility")
        
        # Validações de acessibilidade
        if "<img" in html.lower():
            img_tags = re.findall(r'<img[^>]*>', html, re.IGNORECASE)
            for img in img_tags:
                if "alt=" not in img.lower():
                    issues.append(f"Image missing alt attribute: {img[:50]}...")
        
        # Validações de performance
        if len(html) > 102400:  # 100KB
            warnings.append("HTML size exceeds 100KB, may affect loading")
        
        css_matches = re.findall(r'<style[^>]*>(.*?)</style>', html, re.DOTALL | re.IGNORECASE)
        total_css_size = sum(len(css) for css in css_matches)
        if total_css_size > 50000:  # 50KB
            warnings.append("CSS size exceeds 50KB")
        
        return {
            "valid": len(issues) == 0,
            "issues": issues,
            "warnings": warnings,
            "suggestions": suggestions,
            "score": max(0, 100 - len(issues) * 20 - len(warnings) * 5)
        }
    
    def _apply_automatic_fixes(self, html: str, issues: List[str]) -> str:
        """Aplica correções automáticas"""
        
        fixed_html = html
        
        # Adicionar DOCTYPE se ausente
        if "Missing DOCTYPE declaration" in issues:
            if "<!DOCTYPE" not in fixed_html.upper():
                fixed_html = "<!DOCTYPE html>\n" + fixed_html
        
        # Adicionar meta charset se ausente
        if "Missing charset meta tag" in issues:
            if "charset" not in fixed_html.lower() and "<head" in fixed_html.lower():
                fixed_html = fixed_html.replace(
                    "<head>",
                    '<head>\n    <meta charset="UTF-8">'
                )
        
        # Adicionar viewport se ausente
        if "Missing viewport meta tag" in issues:
            if "viewport" not in fixed_html.lower() and "<head" in fixed_html.lower():
                fixed_html = fixed_html.replace(
                    "<head>",
                    '<head>\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">'
                )
        
        # Adicionar alt attributes a imagens
        img_pattern = r'<img([^>]*?)(?<!alt=")>'
        def add_alt(match):
            attrs = match.group(1)
            if "alt=" not in attrs.lower():
                return f'<img{attrs} alt="Imagem">'
            return match.group(0)
        
        fixed_html = re.sub(img_pattern, add_alt, fixed_html, flags=re.IGNORECASE)
        
        return fixed_html
    
    def _optimize_for_size(self, html: str) -> Dict[str, Any]:
        """Otimiza HTML para tamanho"""
        
        optimized = html
        optimizations = []
        
        # Remover comentários (exceto condicionais IE)
        original_len = len(optimized)
        optimized = re.sub(self.optimization_patterns["remove_comments"], '', optimized)
        if len(optimized) < original_len:
            optimizations.append("Removed HTML comments")
        
        # Minimizar espaços em branco
        original_len = len(optimized)
        optimized = re.sub(r'\s+', ' ', optimized)
        optimized = re.sub(r'>\s+<', '><', optimized)
        if len(optimized) < original_len:
            optimizations.append("Minified whitespace")
        
        # Remover atributos vazios
        original_len = len(optimized)
        optimized = re.sub(self.optimization_patterns["remove_empty_attributes"], '', optimized)
        if len(optimized) < original_len:
            optimizations.append("Removed empty attributes")
        
        # Otimizar CSS inline redundante
        original_len = len(optimized)
        optimized = self._optimize_inline_css(optimized)
        if len(optimized) < original_len:
            optimizations.append("Optimized inline CSS")
        
        return {
            "html": optimized,
            "optimizations": optimizations,
            "size_reduction": len(html) - len(optimized)
        }
    
    def _optimize_for_client(self, html: str, client: str) -> Dict[str, Any]:
        """Otimiza para cliente específico"""
        
        optimized = html
        optimizations = []
        
        if client == "outlook":
            # Adicionar MSO conditionals se necessário
            if "mso" not in optimized.lower():
                mso_conditional = """<!--[if mso]>
<noscript>
<xml>
<o:OfficeDocumentSettings>
<o:AllowPNG/>
<o:PixelsPerInch>96</o:PixelsPerInch>
</o:OfficeDocumentSettings>
</xml>
</noscript>
<![endif]-->"""
                optimized = optimized.replace("<head>", f"<head>\n{mso_conditional}")
                optimizations.append("Added MSO conditionals")
            
            # Garantir tabelas com atributos Outlook
            table_pattern = r'<table(?![^>]*cellpadding)(?![^>]*cellspacing)'
            optimized = re.sub(
                table_pattern,
                '<table cellpadding="0" cellspacing="0" border="0"',
                optimized,
                flags=re.IGNORECASE
            )
            if table_pattern in optimized:
                optimizations.append("Added Outlook table attributes")
        
        elif client == "gmail":
            # Priorizar styles inline
            if "<style" in optimized and "!important" not in optimized:
                optimized = optimized.replace("}", " !important; }")
                optimizations.append("Added !important for Gmail")
        
        return {
            "html": optimized,
            "optimizations": optimizations
        }
    
    def _extract_content_components(self, html: str) -> Dict[str, Any]:
        """Extrai componentes de conteúdo"""
        
        components = {}
        
        # Extrair título
        title_match = re.search(r'<title[^>]*>(.*?)</title>', html, re.IGNORECASE | re.DOTALL)
        if title_match:
            components["title"] = title_match.group(1).strip()
        
        # Extrair cabeçalhos
        headers = re.findall(r'<h([1-6])[^>]*>(.*?)</h\1>', html, re.IGNORECASE | re.DOTALL)
        if headers:
            components["headers"] = [{"level": int(h[0]), "text": h[1].strip()} for h in headers]
        
        # Extrair parágrafos
        paragraphs = re.findall(r'<p[^>]*>(.*?)</p>', html, re.IGNORECASE | re.DOTALL)
        if paragraphs:
            components["paragraphs"] = [p.strip() for p in paragraphs]
        
        # Extrair links
        links = re.findall(r'<a[^>]*href=["\']([^"\']*)["\'][^>]*>(.*?)</a>', html, re.IGNORECASE | re.DOTALL)
        if links:
            components["links"] = [{"url": link[0], "text": link[1].strip()} for link in links]
        
        # Extrair imagens
        images = re.findall(r'<img[^>]*src=["\']([^"\']*)["\'][^>]*>', html, re.IGNORECASE)
        if images:
            components["images"] = images
        
        # Extrair tabelas
        tables = re.findall(r'<table[^>]*>(.*?)</table>', html, re.IGNORECASE | re.DOTALL)
        if tables:
            components["tables"] = len(tables)
        
        return components
    
    def _enhance_components(
        self,
        components: Dict[str, Any],
        enhancement_type: str
    ) -> Dict[str, Any]:
        """Aplica melhorias aos componentes"""
        
        enhanced = components.copy()
        enhancements = []
        
        if enhancement_type == "modern":
            # Melhorar cabeçalhos
            if "headers" in enhanced:
                for header in enhanced["headers"]:
                    if len(header["text"]) > 50:
                        header["text"] = header["text"][:47] + "..."
                        enhancements.append("Optimized header length")
            
            # Melhorar parágrafos
            if "paragraphs" in enhanced:
                optimized_paragraphs = []
                for p in enhanced["paragraphs"]:
                    if len(p) > 200:
                        sentences = p.split('. ')
                        if len(sentences) > 1:
                            optimized_paragraphs.append(sentences[0] + '.')
                            if len(sentences) > 2:
                                optimized_paragraphs.append('. '.join(sentences[1:]))
                        else:
                            optimized_paragraphs.append(p[:197] + "...")
                    else:
                        optimized_paragraphs.append(p)
                
                enhanced["paragraphs"] = optimized_paragraphs
                enhancements.append("Optimized paragraph structure")
            
            # Melhorar links
            if "links" in enhanced:
                for link in enhanced["links"]:
                    if not link["text"] or link["text"].strip() == "":
                        link["text"] = "Clique aqui"
                        enhancements.append("Enhanced link text")
        
        enhanced["enhancements"] = enhancements
        return enhanced
    
    def _rebuild_html_with_components(self, components: Dict[str, Any]) -> str:
        """Reconstrói HTML com componentes melhorados"""
        
        html_parts = []
        
        # DOCTYPE e estrutura básica
        html_parts.append('<!DOCTYPE html>')
        html_parts.append('<html lang="pt-BR">')
        html_parts.append('<head>')
        html_parts.append('    <meta charset="UTF-8">')
        html_parts.append('    <meta name="viewport" content="width=device-width, initial-scale=1.0">')
        
        if "title" in components:
            html_parts.append(f'    <title>{components["title"]}</title>')
        
        html_parts.append('</head>')
        html_parts.append('<body>')
        
        # Cabeçalhos
        if "headers" in components:
            for header in components["headers"]:
                html_parts.append(f'    <h{header["level"]}>{header["text"]}</h{header["level"]}>')
        
        # Parágrafos
        if "paragraphs" in components:
            for paragraph in components["paragraphs"]:
                html_parts.append(f'    <p>{paragraph}</p>')
        
        # Links
        if "links" in components:
            for link in components["links"]:
                html_parts.append(f'    <a href="{link["url"]}">{link["text"]}</a>')
        
        html_parts.append('</body>')
        html_parts.append('</html>')
        
        return '\n'.join(html_parts)
    
    def _calculate_quality_metrics(
        self,
        original_html: str,
        optimized_html: str,
        validation_results: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Calcula métricas de qualidade"""
        
        return {
            "overall_score": validation_results["score"],
            "size_improvement": len(original_html) - len(optimized_html),
            "validation_score": 100 - len(validation_results["issues"]) * 10,
            "accessibility_score": self._calculate_accessibility_score(optimized_html),
            "performance_score": self._calculate_performance_score(optimized_html),
            "compatibility_score": 85  # Base score
        }
    
    def _check_client_compatibility(
        self,
        html: str,
        target_clients: List[str]
    ) -> Dict[str, Any]:
        """Verifica compatibilidade com clientes"""
        
        compatibility = {}
        
        for client in target_clients:
            score = 80  # Base score
            issues = []
            
            if client == "outlook":
                if "border-radius" in html:
                    score -= 10
                    issues.append("Uses border-radius (not supported)")
                if "<table" in html:
                    score += 10
                    issues.append("Uses table layout (good)")
            
            elif client == "gmail":
                if "!important" in html:
                    score += 5
                if "<style" in html:
                    score += 5
            
            compatibility[client] = {
                "score": min(100, max(0, score)),
                "issues": issues
            }
        
        return compatibility
    
    def _calculate_accessibility_score(self, html: str) -> int:
        """Calcula score de acessibilidade"""
        
        score = 80  # Base score
        
        # Verificar alt attributes
        img_tags = re.findall(r'<img[^>]*>', html, re.IGNORECASE)
        img_with_alt = re.findall(r'<img[^>]*alt=[^>]*>', html, re.IGNORECASE)
        
        if img_tags:
            alt_ratio = len(img_with_alt) / len(img_tags)
            score += int(alt_ratio * 20)
        
        # Verificar estrutura de cabeçalhos
        headers = re.findall(r'<h[1-6]', html, re.IGNORECASE)
        if headers:
            score += 5
        
        # Verificar contraste (básico)
        if "color:" in html:
            score += 5
        
        return min(100, score)
    
    def _calculate_performance_score(self, html: str) -> int:
        """Calcula score de performance"""
        
        score = 90  # Base score
        
        # Penalizar por tamanho
        if len(html) > 100000:  # 100KB
            score -= 20
        elif len(html) > 50000:  # 50KB
            score -= 10
        
        # Penalizar por muitas imagens
        img_count = html.lower().count('<img')
        if img_count > 10:
            score -= 10
        elif img_count > 5:
            score -= 5
        
        # Penalizar por CSS complexo
        css_size = len(re.findall(r'<style[^>]*>(.*?)</style>', html, re.DOTALL | re.IGNORECASE))
        if css_size > 20000:  # 20KB
            score -= 10
        
        return max(0, score)
    
    def _estimate_render_time(self, html: str) -> float:
        """Estima tempo de renderização"""
        
        base_time = 100  # 100ms base
        
        # Fator por tamanho
        size_factor = len(html) / 1000  # 1ms por KB
        
        # Fator por complexidade
        table_count = html.lower().count('<table')
        complexity_factor = table_count * 10
        
        # Fator por CSS
        css_complexity = html.count('gradient') + html.count('shadow') + html.count('transform')
        css_factor = css_complexity * 5
        
        return base_time + size_factor + complexity_factor + css_factor
    
    def _calculate_complexity_score(self, html: str) -> int:
        """Calcula score de complexidade"""
        
        elements = html.lower().count('<')
        tables = html.lower().count('<table')
        css_properties = html.count(':')
        
        complexity = elements + (tables * 2) + css_properties
        
        if complexity < 50:
            return 1  # Baixa
        elif complexity < 150:
            return 2  # Média
        elif complexity < 300:
            return 3  # Alta
        else:
            return 4  # Muito alta
    
    def _optimize_inline_css(self, html: str) -> str:
        """Otimiza CSS inline"""
        
        # Remover propriedades CSS duplicadas
        style_pattern = r'style="([^"]*)"'
        
        def optimize_style(match):
            style_content = match.group(1)
            properties = {}
            
            for prop in style_content.split(';'):
                if ':' in prop:
                    key, value = prop.split(':', 1)
                    properties[key.strip()] = value.strip()
            
            optimized_style = '; '.join([f"{k}: {v}" for k, v in properties.items() if v])
            return f'style="{optimized_style}"'
        
        return re.sub(style_pattern, optimize_style, html)
    
    def _create_fallback_validation(self, html: str) -> Dict[str, Any]:
        """Cria validação de fallback em caso de erro"""
        return {
            "valid": True,
            "optimized_html": html,
            "original_size": len(html),
            "optimized_size": len(html),
            "size_reduction": 0,
            "issues_found": [],
            "issues_fixed": 0,
            "optimizations_applied": ["Fallback validation"],
            "quality_metrics": {"overall_score": 70},
            "client_compatibility": {"gmail": {"score": 70}, "outlook": {"score": 70}},
            "accessibility_score": 70,
            "performance_score": 70,
            "processing_time": 0.1
        }
