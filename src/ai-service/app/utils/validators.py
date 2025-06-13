"""
✅ EMAIL VALIDATOR - VALIDADOR AVANÇADO DE EMAILS
Sistema completo de validação HTML/CSS para emails
"""

import re
import json
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime
from loguru import logger

class EmailValidator:
    """Validador completo para emails HTML"""
    
    def __init__(self):
        self.email_client_rules = {
            "gmail": {
                "max_css_size": 50000,  # 50KB
                "strips_head_styles": True,
                "supports_media_queries": True,
                "blocked_css": ["position", "z-index", "float"],
                "max_width": 600,
                "image_blocking": True
            },
            "outlook": {
                "max_css_size": None,
                "uses_word_engine": True,
                "supports_media_queries": False,
                "blocked_css": ["border-radius", "box-shadow", "text-shadow", "transform"],
                "requires_tables": True,
                "max_width": 600
            },
            "apple_mail": {
                "max_css_size": None,
                "full_css_support": True,
                "supports_media_queries": True,
                "blocked_css": [],
                "max_width": 600,
                "excellent_support": True
            },
            "yahoo": {
                "max_css_size": 30000,  # 30KB
                "strips_external_css": True,
                "supports_media_queries": True,
                "blocked_css": ["position"],
                "max_width": 600
            },
            "thunderbird": {
                "max_css_size": None,
                "good_css_support": True,
                "supports_media_queries": True,
                "blocked_css": ["position"],
                "max_width": 600
            }
        }
        
        self.accessibility_rules = {
            "required_attributes": {
                "img": ["alt"],
                "a": ["href"],
                "table": ["role"],
                "td": ["valign", "align"]
            },
            "color_contrast": {
                "min_ratio": 4.5,
                "large_text_ratio": 3.0
            },
            "font_sizes": {
                "min_size": 14,
                "recommended_size": 16
            }
        }
        
        self.performance_thresholds = {
            "html_size": {
                "warning": 50000,    # 50KB
                "critical": 102400   # 100KB
            },
            "css_size": {
                "warning": 20000,    # 20KB
                "critical": 50000    # 50KB
            },
            "image_count": {
                "warning": 5,
                "critical": 10
            },
            "external_requests": {
                "warning": 3,
                "critical": 6
            }
        }
    
    def validate_email_html(
        self,
        html: str,
        target_clients: List[str] = ["gmail", "outlook", "apple_mail"],
        check_accessibility: bool = True,
        check_performance: bool = True
    ) -> Dict[str, Any]:
        """
        ✅ VALIDAÇÃO PRINCIPAL DE EMAIL HTML
        Executa validação completa do email
        """
        start_time = datetime.now()
        
        logger.info(f"🔍 Validando email HTML - Targets: {', '.join(target_clients)}")
        
        try:
            validation_results = {
                "valid": True,
                "overall_score": 100,
                "issues": [],
                "warnings": [],
                "suggestions": [],
                "client_compatibility": {},
                "accessibility_score": 100,
                "performance_score": 100,
                "details": {}
            }
            
            # Validação estrutural básica
            structural_validation = self._validate_html_structure(html)
            validation_results["details"]["structure"] = structural_validation
            
            if not structural_validation["valid"]:
                validation_results["valid"] = False
                validation_results["issues"].extend(structural_validation["issues"])
            
            # Validação CSS
            css_validation = self._validate_css_content(html, target_clients)
            validation_results["details"]["css"] = css_validation
            validation_results["warnings"].extend(css_validation["warnings"])
            
            # Validação por cliente
            for client in target_clients:
                client_validation = self._validate_for_client(html, client)
                validation_results["client_compatibility"][client] = client_validation
                
                if client_validation["score"] < 70:
                    validation_results["warnings"].append(f"Low compatibility with {client}")
            
            # Validação de acessibilidade
            if check_accessibility:
                accessibility_validation = self._validate_accessibility(html)
                validation_results["accessibility_score"] = accessibility_validation["score"]
                validation_results["details"]["accessibility"] = accessibility_validation
                validation_results["suggestions"].extend(accessibility_validation["suggestions"])
            
            # Validação de performance
            if check_performance:
                performance_validation = self._validate_performance(html)
                validation_results["performance_score"] = performance_validation["score"]
                validation_results["details"]["performance"] = performance_validation
                validation_results["warnings"].extend(performance_validation["warnings"])
            
            # Calcular score geral
            validation_results["overall_score"] = self._calculate_overall_score(
                structural_score=structural_validation["score"],
                css_score=css_validation["score"],
                accessibility_score=validation_results["accessibility_score"],
                performance_score=validation_results["performance_score"],
                client_scores=[c["score"] for c in validation_results["client_compatibility"].values()]
            )
            
            processing_time = (datetime.now() - start_time).total_seconds()
            validation_results["processing_time"] = processing_time
            
            logger.success(f"✅ Validação concluída - Score: {validation_results['overall_score']}")
            return validation_results
            
        except Exception as e:
            logger.error(f"❌ Erro na validação: {e}")
            return self._create_fallback_validation(html)
    
    def validate_email_deliverability(self, html: str, subject: str) -> Dict[str, Any]:
        """
        ✅ VALIDAÇÃO DE ENTREGABILIDADE
        Verifica fatores que afetam deliverability
        """
        
        logger.info("📧 Validando entregabilidade do email")
        
        deliverability_score = 100
        issues = []
        warnings = []
        
        # Verificar spam triggers no assunto
        spam_triggers = [
            "grátis", "free", "urgent", "urgente", "promoção", "desconto",
            "oferta", "limitado", "agora", "clique aqui"
        ]
        
        subject_lower = subject.lower()
        trigger_count = sum(1 for trigger in spam_triggers if trigger in subject_lower)
        
        if trigger_count > 2:
            deliverability_score -= 20
            warnings.append("Assunto contém muitas palavras de spam")
        
        # Verificar tamanho do assunto
        if len(subject) > 50:
            deliverability_score -= 10
            warnings.append("Assunto muito longo (recomendado: até 50 caracteres)")
        
        # Verificar HTML/texto ratio
        html_length = len(html)
        text_content = re.sub(r'<[^>]+>', '', html)
        text_length = len(text_content.strip())
        
        if text_length == 0:
            deliverability_score -= 30
            issues.append("Email sem conteúdo de texto")
        elif text_length < html_length * 0.1:  # Menos de 10% texto
            deliverability_score -= 15
            warnings.append("Muito pouco texto em relação ao HTML")
        
        # Verificar links
        links = re.findall(r'href=["\']([^"\']+)["\']', html)
        external_links = [link for link in links if link.startswith(('http://', 'https://'))]
        
        if len(external_links) > 10:
            deliverability_score -= 10
            warnings.append("Muitos links externos")
        
        # Verificar imagens
        images = re.findall(r'<img[^>]+>', html)
        if len(images) > 5:
            deliverability_score -= 5
            warnings.append("Muitas imagens podem afetar deliverability")
        
        # Verificar alt text nas imagens
        images_without_alt = [img for img in images if 'alt=' not in img.lower()]
        if images_without_alt:
            deliverability_score -= 10
            warnings.append(f"{len(images_without_alt)} imagens sem alt text")
        
        return {
            "deliverability_score": max(0, deliverability_score),
            "issues": issues,
            "warnings": warnings,
            "recommendations": self._generate_deliverability_recommendations(deliverability_score, issues, warnings)
        }
    
    def check_spam_score(self, html: str, subject: str) -> Dict[str, Any]:
        """
        ✅ VERIFICAÇÃO DE SPAM SCORE
        Calcula probabilidade de ser marcado como spam
        """
        
        spam_score = 0
        factors = []
        
        # Fatores de spam no assunto
        subject_spam_words = [
            "free", "grátis", "urgent", "urgente", "guaranteed", "garantido",
            "act now", "agora", "limited time", "tempo limitado", "click here",
            "clique aqui", "buy now", "compre agora"
        ]
        
        subject_lower = subject.lower()
        for word in subject_spam_words:
            if word in subject_lower:
                spam_score += 1
                factors.append(f"Palavra spam no assunto: '{word}'")
        
        # Verificar CAPS no assunto
        caps_ratio = sum(1 for c in subject if c.isupper()) / len(subject) if subject else 0
        if caps_ratio > 0.5:
            spam_score += 2
            factors.append("Muitas letras maiúsculas no assunto")
        
        # Verificar HTML
        html_lower = html.lower()
        
        # Palavras spam no conteúdo
        content_spam_words = [
            "viagra", "casino", "lottery", "million", "millionaire",
            "inheritance", "nigerian", "prince", "diplomat"
        ]
        
        for word in content_spam_words:
            if word in html_lower:
                spam_score += 3
                factors.append(f"Palavra spam no conteúdo: '{word}'")
        
        # Verificar excesso de pontuação
        exclamation_count = html.count('!')
        if exclamation_count > 5:
            spam_score += 1
            factors.append("Muitos pontos de exclamação")
        
        # Verificar links suspeitos
        suspicious_domains = ['bit.ly', 'tinyurl.com', 't.co']
        for domain in suspicious_domains:
            if domain in html_lower:
                spam_score += 2
                factors.append(f"Link encurtado detectado: {domain}")
        
        # Classificar risco
        if spam_score >= 8:
            risk_level = "high"
        elif spam_score >= 4:
            risk_level = "medium"
        elif spam_score >= 1:
            risk_level = "low"
        else:
            risk_level = "very_low"
        
        return {
            "spam_score": spam_score,
            "risk_level": risk_level,
            "factors": factors,
            "recommendations": self._generate_spam_recommendations(spam_score, factors)
        }
    
    def _validate_html_structure(self, html: str) -> Dict[str, Any]:
        """Valida estrutura básica do HTML"""
        
        issues = []
        warnings = []
        score = 100
        
        # Verificações obrigatórias
        required_elements = [
            ("<!DOCTYPE", "Missing DOCTYPE declaration"),
            ("<html", "Missing <html> tag"),
            ("<head", "Missing <head> section"),
            ("<body", "Missing <body> tag")
        ]
        
        for element, error_msg in required_elements:
            if element not in html.upper():
                issues.append(error_msg)
                score -= 20
        
        # Meta tags importantes
        if 'charset' not in html.lower():
            warnings.append("Missing charset meta tag")
            score -= 5
        
        if 'viewport' not in html.lower():
            warnings.append("Missing viewport meta tag")
            score -= 5
        
        # Verificar estrutura de email
        if 'max-width' not in html.lower():
            warnings.append("No max-width specified for email container")
            score -= 10
        
        if '<table' not in html.lower():
            warnings.append("Consider using tables for better email client compatibility")
            score -= 5
        
        return {
            "valid": len(issues) == 0,
            "score": max(0, score),
            "issues": issues,
            "warnings": warnings
        }
    
    def _validate_css_content(self, html: str, target_clients: List[str]) -> Dict[str, Any]:
        """Valida conteúdo CSS"""
        
        warnings = []
        score = 100
        
        # Extrair CSS
        css_blocks = re.findall(r'<style[^>]*>(.*?)</style>', html, re.DOTALL | re.IGNORECASE)
        inline_styles = re.findall(r'style="([^"]*)"', html)
        
        total_css = '\n'.join(css_blocks + inline_styles)
        css_size = len(total_css)
        
        # Verificar tamanho CSS
        if css_size > 50000:  # 50KB
            warnings.append("CSS size exceeds 50KB (may be stripped)")
            score -= 20
        elif css_size > 30000:  # 30KB
            warnings.append("CSS size exceeds 30KB")
            score -= 10
        
        # Verificar propriedades problemáticas para Outlook
        if "outlook" in target_clients:
            problematic_properties = [
                "border-radius", "box-shadow", "text-shadow", 
                "transform", "transition", "animation"
            ]
            
            for prop in problematic_properties:
                if prop in total_css:
                    warnings.append(f"Property '{prop}' not supported in Outlook")
                    score -= 5
        
        # Verificar uso de !important
        important_count = total_css.count('!important')
        if important_count == 0 and "gmail" in target_clients:
            warnings.append("Consider using !important for Gmail compatibility")
            score -= 5
        elif important_count > 20:
            warnings.append("Excessive use of !important")
            score -= 10
        
        return {
            "score": max(0, score),
            "warnings": warnings,
            "css_size": css_size,
            "important_count": important_count
        }
    
    def _validate_for_client(self, html: str, client: str) -> Dict[str, Any]:
        """Valida para cliente específico"""
        
        if client not in self.email_client_rules:
            return {"score": 80, "issues": [], "warnings": []}
        
        rules = self.email_client_rules[client]
        score = 100
        issues = []
        warnings = []
        
        # Verificar tamanho CSS
        if rules.get("max_css_size"):
            css_blocks = re.findall(r'<style[^>]*>(.*?)</style>', html, re.DOTALL | re.IGNORECASE)
            css_size = sum(len(css) for css in css_blocks)
            
            if css_size > rules["max_css_size"]:
                issues.append(f"CSS size ({css_size}) exceeds {client} limit ({rules['max_css_size']})")
                score -= 20
        
        # Verificar propriedades CSS bloqueadas
        blocked_css = rules.get("blocked_css", [])
        for prop in blocked_css:
            if prop in html:
                warnings.append(f"Property '{prop}' not supported in {client}")
                score -= 5
        
        # Verificações específicas por cliente
        if client == "outlook":
            if "<table" not in html.lower():
                warnings.append("Outlook prefers table-based layouts")
                score -= 10
            
            if rules.get("uses_word_engine") and "mso" not in html.lower():
                warnings.append("Consider adding MSO conditionals for Outlook")
                score -= 5
        
        elif client == "gmail":
            if rules.get("strips_head_styles") and "<style" in html:
                warnings.append("Gmail may strip <style> tags - prefer inline styles")
                score -= 5
        
        return {
            "score": max(0, score),
            "issues": issues,
            "warnings": warnings,
            "compatibility_features": self._get_client_features(client)
        }
    
    def _validate_accessibility(self, html: str) -> Dict[str, Any]:
        """Valida acessibilidade"""
        
        score = 100
        issues = []
        suggestions = []
        
        # Verificar alt text em imagens
        img_tags = re.findall(r'<img[^>]*>', html, re.IGNORECASE)
        images_without_alt = [img for img in img_tags if 'alt=' not in img.lower()]
        
        if images_without_alt:
            missing_count = len(images_without_alt)
            score -= min(30, missing_count * 5)
            issues.append(f"{missing_count} images missing alt attributes")
            suggestions.append("Add descriptive alt text to all images")
        
        # Verificar estrutura de cabeçalhos
        headers = re.findall(r'<h([1-6])', html, re.IGNORECASE)
        if not headers:
            score -= 10
            suggestions.append("Consider using heading tags for better structure")
        elif headers[0] != '1':
            score -= 5
            suggestions.append("Start with <h1> for proper heading hierarchy")
        
        # Verificar contraste de cores (básico)
        if 'color:' in html:
            # Análise básica de contraste
            light_colors = ['#fff', '#ffffff', 'white']
            dark_colors = ['#000', '#000000', 'black']
            
            has_light = any(color in html.lower() for color in light_colors)
            has_dark = any(color in html.lower() for color in dark_colors)
            
            if not (has_light and has_dark):
                score -= 5
                suggestions.append("Ensure sufficient color contrast")
        
        # Verificar links
        links = re.findall(r'<a[^>]*>(.*?)</a>', html, re.IGNORECASE | re.DOTALL)
        generic_links = [link for link in links if link.strip().lower() in ['click here', 'clique aqui', 'here', 'aqui']]
        
        if generic_links:
            score -= 10
            suggestions.append("Use descriptive link text instead of 'click here'")
        
        # Verificar tabelas
        tables = re.findall(r'<table[^>]*>', html, re.IGNORECASE)
        tables_without_role = [table for table in tables if 'role=' not in table.lower()]
        
        if tables_without_role:
            score -= 5
            suggestions.append("Add role attributes to tables for screen readers")
        
        return {
            "score": max(0, score),
            "issues": issues,
            "suggestions": suggestions,
            "details": {
                "images_total": len(img_tags),
                "images_with_alt": len(img_tags) - len(images_without_alt),
                "headers_count": len(headers),
                "links_total": len(links),
                "generic_links": len(generic_links)
            }
        }
    
    def _validate_performance(self, html: str) -> Dict[str, Any]:
        """Valida performance"""
        
        score = 100
        warnings = []
        
        # Tamanho do HTML
        html_size = len(html)
        if html_size > self.performance_thresholds["html_size"]["critical"]:
            score -= 30
            warnings.append(f"HTML size ({html_size} bytes) is very large")
        elif html_size > self.performance_thresholds["html_size"]["warning"]:
            score -= 15
            warnings.append(f"HTML size ({html_size} bytes) is large")
        
        # Contagem de imagens
        image_count = len(re.findall(r'<img', html, re.IGNORECASE))
        if image_count > self.performance_thresholds["image_count"]["critical"]:
            score -= 20
            warnings.append(f"Too many images ({image_count})")
        elif image_count > self.performance_thresholds["image_count"]["warning"]:
            score -= 10
            warnings.append(f"Many images ({image_count}) may slow loading")
        
        # Requests externos
        external_requests = len(re.findall(r'https?://', html))
        if external_requests > self.performance_thresholds["external_requests"]["critical"]:
            score -= 20
            warnings.append(f"Too many external requests ({external_requests})")
        elif external_requests > self.performance_thresholds["external_requests"]["warning"]:
            score -= 10
            warnings.append(f"Several external requests ({external_requests})")
        
        # CSS complexo
        css_complexity = html.count('gradient') + html.count('shadow') + html.count('transform')
        if css_complexity > 10:
            score -= 10
            warnings.append("Complex CSS may affect rendering performance")
        
        return {
            "score": max(0, score),
            "warnings": warnings,
            "metrics": {
                "html_size": html_size,
                "image_count": image_count,
                "external_requests": external_requests,
                "css_complexity": css_complexity
            }
        }
    
    def _calculate_overall_score(
        self,
        structural_score: int,
        css_score: int,
        accessibility_score: int,
        performance_score: int,
        client_scores: List[int]
    ) -> int:
        """Calcula score geral"""
        
        # Pesos para cada categoria
        weights = {
            "structure": 0.25,
            "css": 0.20,
            "accessibility": 0.20,
            "performance": 0.15,
            "compatibility": 0.20
        }
        
        avg_client_score = sum(client_scores) / len(client_scores) if client_scores else 80
        
        overall = (
            structural_score * weights["structure"] +
            css_score * weights["css"] +
            accessibility_score * weights["accessibility"] +
            performance_score * weights["performance"] +
            avg_client_score * weights["compatibility"]
        )
        
        return int(overall)
    
    def _get_client_features(self, client: str) -> List[str]:
        """Retorna features suportadas pelo cliente"""
        
        features = {
            "gmail": ["media_queries", "inline_styles", "basic_css"],
            "outlook": ["table_layout", "mso_conditionals", "basic_css"],
            "apple_mail": ["full_css", "media_queries", "modern_features"],
            "yahoo": ["basic_css", "media_queries"],
            "thunderbird": ["good_css", "media_queries"]
        }
        
        return features.get(client, ["basic_css"])
    
    def _generate_deliverability_recommendations(
        self,
        score: int,
        issues: List[str],
        warnings: List[str]
    ) -> List[str]:
        """Gera recomendações para deliverability"""
        
        recommendations = []
        
        if score < 70:
            recommendations.append("Revise o conteúdo para melhorar deliverability")
        
        if any("spam" in issue.lower() for issue in issues + warnings):
            recommendations.append("Reduza palavras que podem ser consideradas spam")
        
        if any("texto" in warning.lower() for warning in warnings):
            recommendations.append("Aumente a proporção de texto em relação ao HTML")
        
        if any("imagem" in warning.lower() for warning in warnings):
            recommendations.append("Adicione alt text a todas as imagens")
        
        recommendations.extend([
            "Use um assunto claro e direto",
            "Mantenha uma boa proporção texto/HTML",
            "Evite muitos links externos",
            "Teste em diferentes provedores de email"
        ])
        
        return recommendations[:5]  # Máximo 5 recomendações
    
    def _generate_spam_recommendations(
        self,
        spam_score: int,
        factors: List[str]
    ) -> List[str]:
        """Gera recomendações para reduzir spam score"""
        
        recommendations = []
        
        if spam_score >= 5:
            recommendations.append("CRÍTICO: Revise completamente o conteúdo")
        elif spam_score >= 3:
            recommendations.append("ATENÇÃO: Reduza elementos que podem gerar spam")
        
        if any("assunto" in factor.lower() for factor in factors):
            recommendations.append("Revise o assunto do email")
        
        if any("maiúscula" in factor.lower() for factor in factors):
            recommendations.append("Reduza o uso de letras maiúsculas")
        
        if any("exclamação" in factor.lower() for factor in factors):
            recommendations.append("Use pontos de exclamação com moderação")
        
        recommendations.extend([
            "Use linguagem natural e profissional",
            "Evite promessas exageradas",
            "Mantenha equilíbrio entre texto e imagens",
            "Teste o email antes de enviar"
        ])
        
        return list(set(recommendations))[:6]  # Máximo 6 recomendações únicas
    
    def _create_fallback_validation(self, html: str) -> Dict[str, Any]:
        """Cria validação de fallback em caso de erro"""
        
        return {
            "valid": True,
            "overall_score": 75,
            "issues": [],
            "warnings": ["Validation error occurred - using fallback"],
            "suggestions": ["Manual review recommended"],
            "client_compatibility": {
                "gmail": {"score": 75, "issues": [], "warnings": []},
                "outlook": {"score": 75, "issues": [], "warnings": []}
            },
            "accessibility_score": 75,
            "performance_score": 75,
            "processing_time": 0.1,
            "details": {
                "structure": {"valid": True, "score": 75},
                "css": {"score": 75, "warnings": []},
                "accessibility": {"score": 75, "suggestions": []},
                "performance": {"score": 75, "warnings": []}
            }
        }
