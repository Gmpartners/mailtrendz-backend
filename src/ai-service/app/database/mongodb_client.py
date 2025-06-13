"""
✅ MONGODB CLIENT - CONEXÃO DIRETA PYTHON ↔ MONGODB
Cliente MongoDB para acesso direto aos dados do MailTrendz
"""

import os
import asyncio
from typing import Dict, List, Optional, Any
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase, AsyncIOMotorCollection
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
from loguru import logger

class MongoDBClient:
    """Cliente MongoDB para serviço Python de IA"""
    
    def __init__(self):
        self.client: Optional[AsyncIOMotorClient] = None
        self.database: Optional[AsyncIOMotorDatabase] = None
        self.collections: Dict[str, AsyncIOMotorCollection] = {}
        
        # Configurações de conexão
        self.mongodb_url = os.getenv("MONGODB_URL")
        self.database_name = os.getenv("MONGODB_DATABASE", "mailtrendz")
        
        # Collections do MailTrendz
        self.collection_names = {
            "users": "users",
            "projects": "projects", 
            "chats": "chats",
            "messages": "chatmessages",
            "refresh_tokens": "refresh_tokens"
        }
        
        if not self.mongodb_url:
            logger.warning("⚠️ MONGODB_URL não configurada - modo offline")
        else:
            logger.info(f"🔗 MongoDB Client configurado - Database: {self.database_name}")
    
    async def connect(self) -> bool:
        """Conecta ao MongoDB"""
        
        if not self.mongodb_url:
            logger.error("❌ MONGODB_URL não configurada")
            return False
        
        try:
            logger.info("🔄 Conectando ao MongoDB...")
            
            # Criar cliente
            self.client = AsyncIOMotorClient(
                self.mongodb_url,
                serverSelectionTimeoutMS=5000,  # 5s timeout
                connectTimeoutMS=10000,         # 10s timeout
                socketTimeoutMS=20000,          # 20s socket timeout
                maxPoolSize=10,                 # Pool de conexões
                retryWrites=True
            )
            
            # Testar conexão
            await self.client.admin.command('ping')
            
            # Selecionar database
            self.database = self.client[self.database_name]
            
            # Configurar collections
            for collection_key, collection_name in self.collection_names.items():
                self.collections[collection_key] = self.database[collection_name]
            
            logger.success("✅ Conectado ao MongoDB com sucesso")
            return True
            
        except (ConnectionFailure, ServerSelectionTimeoutError) as e:
            logger.error(f"❌ Erro na conexão MongoDB: {e}")
            return False
        except Exception as e:
            logger.error(f"❌ Erro inesperado ao conectar MongoDB: {e}")
            return False
    
    async def disconnect(self):
        """Desconecta do MongoDB"""
        if self.client:
            self.client.close()
            logger.info("🔒 Desconectado do MongoDB")
    
    async def health_check(self) -> Dict[str, Any]:
        """Verifica saúde da conexão MongoDB"""
        
        if not self.client or not self.database:
            return {
                "status": "disconnected",
                "error": "Client not connected"
            }
        
        try:
            # Ping do servidor
            start_time = datetime.now()
            await self.client.admin.command('ping')
            response_time = (datetime.now() - start_time).total_seconds()
            
            # Verificar collections
            collection_status = {}
            for key, collection in self.collections.items():
                try:
                    count = await collection.estimated_document_count()
                    collection_status[key] = {
                        "status": "ok",
                        "document_count": count
                    }
                except Exception as e:
                    collection_status[key] = {
                        "status": "error",
                        "error": str(e)
                    }
            
            return {
                "status": "connected",
                "response_time": response_time,
                "database": self.database_name,
                "collections": collection_status,
                "timestamp": datetime.now()
            }
            
        except Exception as e:
            return {
                "status": "error",
                "error": str(e),
                "timestamp": datetime.now()
            }
    
    # ================================
    # MÉTODOS PARA PROJECTS
    # ================================
    
    async def get_project_by_id(self, project_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        """Busca projeto por ID e usuário"""
        
        if not self.collections.get("projects"):
            return None
        
        try:
            from bson import ObjectId
            
            project = await self.collections["projects"].find_one({
                "_id": ObjectId(project_id),
                "userId": ObjectId(user_id)
            })
            
            if project:
                # Converter ObjectId para string
                project["id"] = str(project["_id"])
                project["userId"] = str(project["userId"])
                
                logger.info(f"✅ Projeto encontrado: {project_id}")
                return project
            
            logger.warning(f"⚠️ Projeto não encontrado: {project_id}")
            return None
            
        except Exception as e:
            logger.error(f"❌ Erro ao buscar projeto {project_id}: {e}")
            return None
    
    async def update_project_content(
        self,
        project_id: str,
        user_id: str,
        new_content: Dict[str, Any],
        modification_details: Optional[Dict[str, Any]] = None
    ) -> bool:
        """Atualiza conteúdo do projeto"""
        
        if not self.collections.get("projects"):
            return False
        
        try:
            from bson import ObjectId
            
            # Preparar dados de atualização
            update_data = {
                "content.html": new_content.get("html"),
                "content.subject": new_content.get("subject"),
                "content.text": new_content.get("text"),
                "content.previewText": new_content.get("previewText"),
                "updatedAt": datetime.now()
            }
            
            # Atualizar metadata se fornecida
            if modification_details:
                current_version = modification_details.get("currentVersion", 1)
                update_data.update({
                    "metadata.version": current_version + 1,
                    "metadata.lastModification": {
                        "by": "ai-python-service",
                        "timestamp": datetime.now(),
                        "details": modification_details
                    }
                })
            
            # Executar update
            result = await self.collections["projects"].update_one(
                {
                    "_id": ObjectId(project_id),
                    "userId": ObjectId(user_id)
                },
                {"$set": update_data}
            )
            
            if result.modified_count > 0:
                logger.success(f"✅ Projeto {project_id} atualizado com sucesso")
                return True
            else:
                logger.warning(f"⚠️ Nenhuma modificação feita no projeto {project_id}")
                return False
                
        except Exception as e:
            logger.error(f"❌ Erro ao atualizar projeto {project_id}: {e}")
            return False
    
    async def get_project_with_chat(self, project_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        """Busca projeto com informações do chat"""
        
        try:
            # Buscar projeto
            project = await self.get_project_by_id(project_id, user_id)
            if not project:
                return None
            
            # Buscar chat associado
            chat = await self.get_chat_by_project(project_id, user_id)
            
            result = {
                "project": project,
                "chat": chat,
                "hasActiveChat": chat is not None
            }
            
            return result
            
        except Exception as e:
            logger.error(f"❌ Erro ao buscar projeto com chat {project_id}: {e}")
            return None
    
    # ================================
    # MÉTODOS PARA CHATS
    # ================================
    
    async def get_chat_by_project(self, project_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        """Busca chat por projeto"""
        
        if not self.collections.get("chats"):
            return None
        
        try:
            from bson import ObjectId
            
            chat = await self.collections["chats"].find_one({
                "projectId": ObjectId(project_id),
                "userId": ObjectId(user_id),
                "isActive": True
            })
            
            if chat:
                chat["id"] = str(chat["_id"])
                chat["userId"] = str(chat["userId"])
                chat["projectId"] = str(chat["projectId"])
                
                return chat
            
            return None
            
        except Exception as e:
            logger.error(f"❌ Erro ao buscar chat do projeto {project_id}: {e}")
            return None
    
    async def get_chat_messages(self, chat_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Busca mensagens do chat"""
        
        if not self.collections.get("messages"):
            return []
        
        try:
            from bson import ObjectId
            
            cursor = self.collections["messages"].find({
                "chatId": ObjectId(chat_id)
            }).sort("createdAt", 1).limit(limit)
            
            messages = []
            async for message in cursor:
                message["id"] = str(message["_id"])
                message["chatId"] = str(message["chatId"])
                messages.append(message)
            
            return messages
            
        except Exception as e:
            logger.error(f"❌ Erro ao buscar mensagens do chat {chat_id}: {e}")
            return []
    
    async def create_chat_message(
        self,
        chat_id: str,
        message_type: str,
        content: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Optional[str]:
        """Cria nova mensagem no chat"""
        
        if not self.collections.get("messages"):
            return None
        
        try:
            from bson import ObjectId
            
            message_data = {
                "chatId": ObjectId(chat_id),
                "type": message_type,
                "content": content,
                "metadata": metadata or {},
                "createdAt": datetime.now(),
                "updatedAt": datetime.now()
            }
            
            result = await self.collections["messages"].insert_one(message_data)
            
            if result.inserted_id:
                logger.info(f"✅ Mensagem criada no chat {chat_id}")
                return str(result.inserted_id)
            
            return None
            
        except Exception as e:
            logger.error(f"❌ Erro ao criar mensagem no chat {chat_id}: {e}")
            return None
    
    async def update_chat_metadata(
        self,
        chat_id: str,
        metadata_update: Dict[str, Any]
    ) -> bool:
        """Atualiza metadata do chat"""
        
        if not self.collections.get("chats"):
            return False
        
        try:
            from bson import ObjectId
            
            update_data = {
                f"metadata.{key}": value 
                for key, value in metadata_update.items()
            }
            update_data["metadata.lastActivity"] = datetime.now()
            
            result = await self.collections["chats"].update_one(
                {"_id": ObjectId(chat_id)},
                {"$set": update_data}
            )
            
            return result.modified_count > 0
            
        except Exception as e:
            logger.error(f"❌ Erro ao atualizar metadata do chat {chat_id}: {e}")
            return False
    
    # ================================
    # MÉTODOS PARA USERS  
    # ================================
    
    async def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Busca usuário por ID"""
        
        if not self.collections.get("users"):
            return None
        
        try:
            from bson import ObjectId
            
            user = await self.collections["users"].find_one({
                "_id": ObjectId(user_id)
            })
            
            if user:
                user["id"] = str(user["_id"])
                # Remover campos sensíveis
                user.pop("password", None)
                user.pop("__v", None)
                
                return user
            
            return None
            
        except Exception as e:
            logger.error(f"❌ Erro ao buscar usuário {user_id}: {e}")
            return None
    
    # ================================
    # MÉTODOS AUXILIARES
    # ================================
    
    async def get_collection_stats(self) -> Dict[str, Any]:
        """Retorna estatísticas das collections"""
        
        stats = {}
        
        for key, collection in self.collections.items():
            try:
                count = await collection.estimated_document_count()
                stats[key] = {
                    "document_count": count,
                    "status": "ok"
                }
            except Exception as e:
                stats[key] = {
                    "document_count": 0,
                    "status": "error",
                    "error": str(e)
                }
        
        return stats
    
    async def test_operations(self) -> Dict[str, Any]:
        """Testa operações básicas"""
        
        test_results = {
            "connection": False,
            "read": False,
            "write": False,
            "errors": []
        }
        
        try:
            # Testar conexão
            await self.client.admin.command('ping')
            test_results["connection"] = True
            
            # Testar leitura
            if self.collections.get("users"):
                await self.collections["users"].find_one()
                test_results["read"] = True
            
            # Testar escrita (collection de teste)
            test_collection = self.database["ai_service_test"]
            test_doc = {
                "test": True,
                "timestamp": datetime.now()
            }
            
            result = await test_collection.insert_one(test_doc)
            if result.inserted_id:
                await test_collection.delete_one({"_id": result.inserted_id})
                test_results["write"] = True
            
        except Exception as e:
            test_results["errors"].append(str(e))
        
        return test_results

# Instância global do cliente
mongodb_client = MongoDBClient()

async def init_mongodb() -> bool:
    """Inicializa conexão MongoDB"""
    return await mongodb_client.connect()

async def close_mongodb():
    """Fecha conexão MongoDB"""
    await mongodb_client.disconnect()
