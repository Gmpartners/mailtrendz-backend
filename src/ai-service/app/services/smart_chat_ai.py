"""
✅ SMARTCHATWITHAI - CHAT INTELIGENTE COM IA
Método principal para chat inteligente com contexto completo
"""

import asyncio
import json
from typing import Dict, List, Optional, Any
from datetime import datetime
from loguru import logger

from .ai_coordinator import AICoordinator
from ..database.mongodb_client import mongodb_client

class SmartChatAI:
    """Chat inteligente com IA e contexto completo"""
    
    def __init__(self):
        self.ai_coordinator = AICoordinator()
    
    async def smartChatWithAI(
        self,
        message: str,
        chatHistory: List[Dict[str, str]],
        projectContext: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        ✅ CHAT INTELIGENTE COM IA
        Sistema principal de chat com contexto total
        """
        start_time = datetime.now()
        
        try:
            logger.info(f"💬 Chat inteligente iniciado - Projeto: {projectContext.get('projectName', 'N/A')}")
            
            # Analisar intenção do usuário
            intent_analysis = await self._analyzeUserIntent(message, projectContext)
            
            # Preparar contexto completo para IA
            full_context = await self._prepareFullContext(
                message=message,
                chatHistory=chatHistory,
                projectContext=projectContext,
                intentAnalysis=intent_analysis
            )
            
            # Gerar resposta inteligente
            ai_response = await self._generateIntelligentResponse(
                message=message,
                fullContext=full_context,
                intentAnalysis=intent_analysis
            )
            
            # Processar modificações se necessário
            should_update_email = intent_analysis.get("requiresEmailUpdate", False)
            enhanced_content = None
            
            if should_update_email and projectContext.get("hasProjectContent"):
                enhanced_content = await self._processEmailModifications(
                    message=message,
                    projectContext=projectContext,
                    intentAnalysis=intent_analysis
                )
            
            processing_time = (datetime.now() - start_time).total_seconds()
            
            result = {
                "response": ai_response["content"],
                "shouldUpdateEmail": should_update_email,
                "enhancedContent": enhanced_content,
                "suggestions": ai_response.get("suggestions", []),
                "metadata": {
                    "model": ai_response.get("model", "claude-3.5-sonnet"),
                    "confidence": ai_response.get("confidence", 0.9),
                    "processingTime": processing_time,
                    "intentDetected": intent_analysis.get("primaryIntent"),
                    "emailUpdateRequired": should_update_email,
                    "contextUsed": len(chatHistory)
                }
            }
            
            logger.success(f"✅ Chat inteligente concluído - {processing_time:.3f}s")
            return result
            
        except Exception as e:
            logger.error(f"❌ Erro no chat inteligente: {e}")
            return await self._generateFallbackResponse(message, projectContext)
    
    async def _analyzeUserIntent(
        self,
        message: str,
        projectContext: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Analisa intenção do usuário"""
        
        message_lower = message.lower()
        
        # Detectar intenções principais
        intents = {
            "color_change": any(word in message_lower for word in ["cor", "color", "azul", "verde", "vermelho", "roxo"]),
            "text_modification": any(word in message_lower for word in ["texto", "escrever", "mudar", "alterar", "conteúdo"]),
            "cta_change": any(word in message_lower for word in ["botão", "cta", "call to action", "clique"]),
            "style_change": any(word in message_lower for word in ["estilo", "design", "layout", "aparência"]),
            "content_addition": any(word in message_lower for word in ["adicionar", "incluir", "acrescentar", "novo"]),
            "general_question": any(word in message_lower for word in ["como", "o que", "porque", "quando", "onde"]),
            "email_generation": any(word in message_lower for word in ["criar", "gerar", "novo email", "fazer"])
        }
        
        # Determinar intenção primária
        primary_intent = "general_conversation"
        for intent, detected in intents.items():
            if detected:
                primary_intent = intent
                break
        
        # Verificar se requer atualização de email
        requires_email_update = any([
            intents["color_change"],
            intents["text_modification"], 
            intents["cta_change"],
            intents["style_change"],
            intents["content_addition"]
        ])
        
        # Extrair detalhes específicos
        details = {}
        
        if intents["color_change"]:
            for color in ["azul", "verde", "vermelho", "roxo", "amarelo", "laranja"]:
                if color in message_lower:
                    details["targetColor"] = color
                    break
        
        if intents["cta_change"]:
            # Procurar texto entre aspas
            import re
            quotes_match = re.search(r'"([^"]+)"', message)
            if quotes_match:
                details["newCtaText"] = quotes_match.group(1)
        
        return {
            "primaryIntent": primary_intent,
            "detectedIntents": [k for k, v in intents.items() if v],
            "requiresEmailUpdate": requires_email_update and projectContext.get("hasProjectContent", False),
            "details": details,
            "confidence": 0.85 if any(intents.values()) else 0.6
        }
    
    async def _prepareFullContext(
        self,
        message: str,
        chatHistory: List[Dict[str, str]],
        projectContext: Dict[str, Any],
        intentAnalysis: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Prepara contexto completo para IA"""
        
        # Contexto base
        context = {
            "currentMessage": message,
            "conversationHistory": chatHistory[-10:],  # Últimas 10 mensagens
            "projectInfo": {
                "name": projectContext.get("projectName", ""),
                "type": projectContext.get("type", "campaign"),
                "industry": projectContext.get("industry", "geral"),
                "tone": projectContext.get("tone", "professional"),
                "hasContent": projectContext.get("hasProjectContent", False)
            },
            "userIntent": intentAnalysis,
            "capabilities": [
                "modify_colors",
                "change_text",
                "update_cta",
                "modify_style",
                "add_content",
                "generate_suggestions"
            ]
        }
        
        # Adicionar contexto do projeto se disponível
        if projectContext.get("currentEmailContent"):
            email_content = projectContext["currentEmailContent"]
            context["currentEmail"] = {
                "subject": email_content.get("subject", ""),
                "hasHTML": bool(email_content.get("html", "")),
                "htmlLength": len(email_content.get("html", "")),
                "estimatedType": self._estimateEmailType(email_content.get("html", ""))
            }
        
        return context
    
    async def _generateIntelligentResponse(
        self,
        message: str,
        fullContext: Dict[str, Any],
        intentAnalysis: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Gera resposta inteligente da IA"""
        
        # Construir prompt contextual
        system_prompt = self._buildContextualPrompt(fullContext, intentAnalysis)
        
        user_prompt = f"""
Mensagem do usuário: {message}

Contexto do projeto: {fullContext['projectInfo']['name']} ({fullContext['projectInfo']['industry']})
Intenção detectada: {intentAnalysis['primaryIntent']}
Possui conteúdo de email: {fullContext['projectInfo']['hasContent']}

Responda de forma natural e útil, considerando o contexto completo.
"""
        
        try:
            # Chamar IA
            ai_result = await self.ai_coordinator._call_ai_with_fallbacks([
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ])
            
            return {
                "content": ai_result["content"],
                "model": ai_result["model"],
                "confidence": 0.9,
                "suggestions": self._extractSuggestions(ai_result["content"])
            }
            
        except Exception as e:
            logger.error(f"❌ Erro na geração de resposta: {e}")
            return {
                "content": f"Entendi sua mensagem sobre '{message[:50]}...'. Houve um problema temporário, mas posso ajudar você.",
                "model": "fallback",
                "confidence": 0.5,
                "suggestions": []
            }
    
    async def _processEmailModifications(
        self,
        message: str,
        projectContext: Dict[str, Any],
        intentAnalysis: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Processa modificações no email"""
        
        try:
            current_content = projectContext.get("currentEmailContent", {})
            current_html = current_content.get("html", "")
            
            if not current_html:
                return None
            
            # Usar AI Coordinator para modificar email
            modification_result = await self.ai_coordinator.modify_email_intelligently(
                html=current_html,
                instructions=message,
                context=projectContext,
                preserve_structure=True
            )
            
            return {
                "html": modification_result.get("html"),
                "subject": modification_result.get("subject"),
                "text": modification_result.get("text"),
                "modifications": modification_result.get("modifications_applied", [])
            }
            
        except Exception as e:
            logger.error(f"❌ Erro ao processar modificações: {e}")
            return None
    
    def _buildContextualPrompt(
        self,
        fullContext: Dict[str, Any],
        intentAnalysis: Dict[str, Any]
    ) -> str:
        """Constrói prompt contextual para IA"""
        
        return f"""Você é um assistente especializado em email marketing e design.

CONTEXTO DO PROJETO:
- Nome: {fullContext['projectInfo']['name']}
- Tipo: {fullContext['projectInfo']['type']}
- Indústria: {fullContext['projectInfo']['industry']}
- Tom: {fullContext['projectInfo']['tone']}
- Possui conteúdo: {fullContext['projectInfo']['hasContent']}

INTENÇÃO DO USUÁRIO:
- Intenção primária: {intentAnalysis['primaryIntent']}
- Confiança: {intentAnalysis['confidence']}
- Requer atualização: {intentAnalysis['requiresEmailUpdate']}

SUAS CAPACIDADES:
- Modificar cores, textos, CTAs
- Ajustar estilos e layouts
- Adicionar conteúdo
- Gerar sugestões
- Explicar conceitos de email marketing

INSTRUÇÕES:
1. Responda de forma natural e conversacional
2. Seja específico sobre modificações
3. Ofereça sugestões quando apropriado
4. Use exemplos práticos
5. Mantenha tom profissional mas amigável

Se o usuário solicitar modificações, confirme o que será alterado.
Se for uma pergunta geral, forneça informações úteis.
"""
    
    def _extractSuggestions(self, content: str) -> List[str]:
        """Extrai sugestões do conteúdo da resposta"""
        
        suggestions = []
        
        # Procurar por listas de sugestões
        import re
        
        # Padrões para identificar sugestões
        patterns = [
            r'Sugestões?:\s*\n((?:[-*•]\s*.+\n?)+)',
            r'Você pode:\s*\n((?:[-*•]\s*.+\n?)+)',
            r'Opções?:\s*\n((?:[-*•]\s*.+\n?)+)'
        ]
        
        for pattern in patterns:
            matches = re.findall(pattern, content, re.MULTILINE)
            for match in matches:
                items = re.findall(r'[-*•]\s*(.+)', match)
                suggestions.extend([item.strip() for item in items])
        
        return suggestions[:5]  # Máximo 5 sugestões
    
    def _estimateEmailType(self, html: str) -> str:
        """Estima tipo do email baseado no HTML"""
        
        html_lower = html.lower()
        
        if "bem-vindo" in html_lower or "welcome" in html_lower:
            return "welcome"
        elif "newsletter" in html_lower or "novidades" in html_lower:
            return "newsletter"
        elif "oferta" in html_lower or "desconto" in html_lower:
            return "promotional"
        else:
            return "general"
    
    async def _generateFallbackResponse(
        self,
        message: str,
        projectContext: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Gera resposta de fallback"""
        
        project_name = projectContext.get("projectName", "seu projeto")
        
        fallback_response = f"""Entendi sua mensagem: "{message[:50]}{'...' if len(message) > 50 else ''}"

Estou processando sua solicitação para {project_name}. 

**Sistema temporariamente indisponível** - Tente:
• Recarregar a página (F5)
• Aguardar alguns segundos
• Reformular de forma mais específica

Posso ajudar com modificações de cores, textos, botões e muito mais! 💪"""
        
        return {
            "response": fallback_response,
            "shouldUpdateEmail": False,
            "enhancedContent": None,
            "suggestions": [
                "Recarregar a página",
                "Aguardar alguns segundos",
                "Reformular a solicitação"
            ],
            "metadata": {
                "model": "fallback-response",
                "confidence": 0.5,
                "processingTime": 0.1,
                "intentDetected": "fallback",
                "emailUpdateRequired": False,
                "contextUsed": 0
            }
        }

# Instância global para uso
smart_chat_ai = SmartChatAI()