"""
✅ PROJECT MODELS - MODELOS PYTHON PARA PROJETOS
Modelos Python correspondentes aos TypeScript do Node.js
"""

from typing import Dict, List, Optional, Any
from datetime import datetime
from pydantic import BaseModel, Field
from enum import Enum

class ProjectType(str, Enum):
    WELCOME = "welcome"
    NEWSLETTER = "newsletter"
    CAMPAIGN = "campaign"
    PROMOTIONAL = "promotional"
    ANNOUNCEMENT = "announcement"
    FOLLOW_UP = "follow-up"

class ProjectStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    COMPLETED = "completed"

class MessageType(str, Enum):
    USER = "user"
    AI = "ai"
    SYSTEM = "system"

class EmailContent(BaseModel):
    """Conteúdo do email"""
    html: str = Field(..., description="HTML do email")
    text: str = Field(..., description="Versão texto do email")
    subject: str = Field(..., description="Assunto do email")
    previewText: Optional[str] = Field(None, description="Texto de preview")

class ProjectMetadata(BaseModel):
    """Metadata do projeto"""
    industry: str = Field(..., description="Indústria do negócio")
    targetAudience: Optional[str] = Field(None, description="Público-alvo")
    tone: str = Field(default="professional", description="Tom do email")
    originalPrompt: str = Field(..., description="Prompt original usado")
    version: int = Field(default=1, description="Versão do projeto")
    lastImprovement: Optional[Dict[str, Any]] = Field(None, description="Última melhoria")
    lastModification: Optional[Dict[str, Any]] = Field(None, description="Última modificação")

class ProjectStats(BaseModel):
    """Estatísticas do projeto"""
    opens: int = Field(default=0, description="Número de aberturas")
    clicks: int = Field(default=0, description="Número de cliques")
    uses: int = Field(default=1, description="Número de usos")
    views: int = Field(default=0, description="Número de visualizações")

class Project(BaseModel):
    """Modelo completo do projeto"""
    id: Optional[str] = Field(None, description="ID do projeto")
    userId: str = Field(..., description="ID do usuário")
    name: str = Field(..., description="Nome do projeto")
    description: str = Field(..., description="Descrição do projeto")
    type: ProjectType = Field(..., description="Tipo do projeto")
    status: ProjectStatus = Field(default=ProjectStatus.DRAFT, description="Status do projeto")
    content: EmailContent = Field(..., description="Conteúdo do email")
    metadata: ProjectMetadata = Field(..., description="Metadata do projeto")
    stats: ProjectStats = Field(default_factory=ProjectStats, description="Estatísticas")
    tags: List[str] = Field(default_factory=list, description="Tags do projeto")
    color: Optional[str] = Field(None, description="Cor do projeto")
    isPublic: bool = Field(default=False, description="Projeto público")
    chatId: Optional[str] = Field(None, description="ID do chat associado")
    createdAt: Optional[datetime] = Field(None, description="Data de criação")
    updatedAt: Optional[datetime] = Field(None, description="Data de atualização")

class ChatMetadata(BaseModel):
    """Metadata do chat"""
    totalMessages: int = Field(default=0, description="Total de mensagens")
    lastActivity: datetime = Field(default_factory=datetime.now, description="Última atividade")
    emailUpdates: int = Field(default=0, description="Atualizações de email")
    createdBy: str = Field(default="user", description="Criado por")
    version: str = Field(default="2.0.0", description="Versão do sistema")
    lastUpdateSuccess: Optional[bool] = Field(None, description="Última atualização bem-sucedida")

class Chat(BaseModel):
    """Modelo do chat"""
    id: Optional[str] = Field(None, description="ID do chat")
    userId: str = Field(..., description="ID do usuário")
    projectId: Optional[str] = Field(None, description="ID do projeto")
    title: str = Field(..., description="Título do chat")
    isActive: bool = Field(default=True, description="Chat ativo")
    metadata: ChatMetadata = Field(default_factory=ChatMetadata, description="Metadata do chat")
    createdAt: Optional[datetime] = Field(None, description="Data de criação")
    updatedAt: Optional[datetime] = Field(None, description="Data de atualização")

class MessageMetadata(BaseModel):
    """Metadata da mensagem"""
    emailUpdated: bool = Field(default=False, description="Email foi atualizado")
    suggestions: List[str] = Field(default_factory=list, description="Sugestões")
    model: Optional[str] = Field(None, description="Modelo de IA usado")
    tokens: int = Field(default=0, description="Tokens consumidos")
    confidence: Optional[float] = Field(None, description="Confiança da resposta")
    executionTime: float = Field(default=0.0, description="Tempo de execução")
    enhancedFeatures: List[str] = Field(default_factory=list, description="Features avançadas")
    isWelcome: bool = Field(default=False, description="Mensagem de boas-vindas")
    projectContextUsed: bool = Field(default=False, description="Contexto do projeto usado")
    analysisData: Optional[Dict[str, Any]] = Field(None, description="Dados de análise")
    originalPrompt: Optional[str] = Field(None, description="Prompt original")
    modifications: List[Dict[str, Any]] = Field(default_factory=list, description="Modificações")
    performance: Optional[Dict[str, Any]] = Field(None, description="Performance")
    projectUpdated: bool = Field(default=False, description="Projeto foi atualizado")
    updateSuccess: bool = Field(default=False, description="Atualização bem-sucedida")
    aiVersion: str = Field(default="2.0.0-python", description="Versão da IA")

class ChatMessage(BaseModel):
    """Modelo da mensagem do chat"""
    id: Optional[str] = Field(None, description="ID da mensagem")
    chatId: str = Field(..., description="ID do chat")
    type: MessageType = Field(..., description="Tipo da mensagem")
    content: str = Field(..., description="Conteúdo da mensagem")
    metadata: MessageMetadata = Field(default_factory=MessageMetadata, description="Metadata")
    createdAt: Optional[datetime] = Field(None, description="Data de criação")
    updatedAt: Optional[datetime] = Field(None, description="Data de atualização")

class User(BaseModel):
    """Modelo básico do usuário"""
    id: Optional[str] = Field(None, description="ID do usuário")
    name: str = Field(..., description="Nome do usuário")
    email: str = Field(..., description="Email do usuário")
    subscription: str = Field(default="free", description="Tipo de assinatura")
    createdAt: Optional[datetime] = Field(None, description="Data de criação")
    updatedAt: Optional[datetime] = Field(None, description="Data de atualização")

# ================================
# MODELOS DE REQUEST/RESPONSE
# ================================

class ProjectContext(BaseModel):
    """Contexto do projeto para IA"""
    userId: str = Field(..., description="ID do usuário")
    projectName: str = Field(..., description="Nome do projeto")
    type: str = Field(..., description="Tipo do projeto")
    industry: str = Field(..., description="Indústria")
    targetAudience: Optional[str] = Field(None, description="Público-alvo")
    tone: str = Field(default="professional", description="Tom")
    status: Optional[str] = Field(None, description="Status")
    hasProjectContent: bool = Field(default=False, description="Tem conteúdo")
    currentEmailContent: Optional[Dict[str, Any]] = Field(None, description="Conteúdo atual")
    originalPrompt: Optional[str] = Field(None, description="Prompt original")

class AIProcessingRequest(BaseModel):
    """Request para processamento de IA"""
    prompt: str = Field(..., description="Prompt do usuário")
    chatHistory: List[Dict[str, Any]] = Field(default_factory=list, description="Histórico do chat")
    projectContext: ProjectContext = Field(..., description="Contexto do projeto")
    requestType: str = Field(..., description="Tipo de request")
    userHistory: Optional[Dict[str, Any]] = Field(None, description="Histórico do usuário")

class AIProcessingResponse(BaseModel):
    """Response do processamento de IA"""
    response: str = Field(..., description="Resposta da IA")
    shouldUpdateEmail: bool = Field(default=False, description="Deve atualizar email")
    enhancedContent: Optional[Dict[str, Any]] = Field(None, description="Conteúdo melhorado")
    analysis: Optional[Dict[str, Any]] = Field(None, description="Análise do prompt")
    suggestions: List[str] = Field(default_factory=list, description="Sugestões")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Metadata")

class EmailGenerationRequest(BaseModel):
    """Request para geração de email"""
    prompt: str = Field(..., description="Prompt para geração")
    industry: str = Field(default="geral", description="Indústria")
    tone: str = Field(default="professional", description="Tom")
    emailType: str = Field(default="promotional", description="Tipo de email")
    urgency: str = Field(default="medium", description="Urgência")
    context: Optional[Dict[str, Any]] = Field(None, description="Contexto adicional")

class EmailModificationRequest(BaseModel):
    """Request para modificação de email"""
    projectId: str = Field(..., description="ID do projeto")
    userId: str = Field(..., description="ID do usuário")
    instructions: str = Field(..., description="Instruções de modificação")
    chatId: Optional[str] = Field(None, description="ID do chat")
    preserveStructure: bool = Field(default=True, description="Preservar estrutura")

# ================================
# UTILITÁRIOS E CONVERSORES
# ================================

def project_to_dict(project: Project) -> Dict[str, Any]:
    """Converte Project para dict MongoDB"""
    data = project.dict(exclude_none=True)
    
    # Converter datetime para MongoDB
    if data.get("createdAt"):
        data["createdAt"] = data["createdAt"]
    if data.get("updatedAt"):
        data["updatedAt"] = data["updatedAt"]
    
    return data

def dict_to_project(data: Dict[str, Any]) -> Project:
    """Converte dict MongoDB para Project"""
    # Converter ObjectId para string se necessário
    if "_id" in data:
        data["id"] = str(data["_id"])
        del data["_id"]
    
    if "userId" in data and hasattr(data["userId"], "str"):
        data["userId"] = str(data["userId"])
    
    return Project(**data)

def chat_to_dict(chat: Chat) -> Dict[str, Any]:
    """Converte Chat para dict MongoDB"""
    data = chat.dict(exclude_none=True)
    return data

def dict_to_chat(data: Dict[str, Any]) -> Chat:
    """Converte dict MongoDB para Chat"""
    if "_id" in data:
        data["id"] = str(data["_id"])
        del data["_id"]
    
    return Chat(**data)

def message_to_dict(message: ChatMessage) -> Dict[str, Any]:
    """Converte ChatMessage para dict MongoDB"""
    data = message.dict(exclude_none=True)
    return data

def dict_to_message(data: Dict[str, Any]) -> ChatMessage:
    """Converte dict MongoDB para ChatMessage"""
    if "_id" in data:
        data["id"] = str(data["_id"])
        del data["_id"]
    
    return ChatMessage(**data)

# ================================
# VALIDADORES
# ================================

def validate_project_data(data: Dict[str, Any]) -> bool:
    """Valida dados do projeto"""
    required_fields = ["userId", "name", "description", "type", "content"]
    
    for field in required_fields:
        if field not in data:
            return False
    
    # Validar conteúdo do email
    content = data.get("content", {})
    if not content.get("html") or not content.get("subject"):
        return False
    
    return True

def validate_chat_data(data: Dict[str, Any]) -> bool:
    """Valida dados do chat"""
    required_fields = ["userId", "title"]
    
    for field in required_fields:
        if field not in data:
            return False
    
    return True

def validate_message_data(data: Dict[str, Any]) -> bool:
    """Valida dados da mensagem"""
    required_fields = ["chatId", "type", "content"]
    
    for field in required_fields:
        if field not in data:
            return False
    
    # Validar tipo de mensagem
    if data["type"] not in ["user", "ai", "system"]:
        return False
    
    return True
