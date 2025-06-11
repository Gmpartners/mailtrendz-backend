// Script de Diagnóstico e Correção - MailTrendz
const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mailtrendz';
const PROJECT_ID = '68476981e433b220d31b08ca';
const CHAT_ID = '68476981e433b220d31b08cc';
const USER_ID = '68450da093b2489ffc50d685';

class MailTrendzDebugger {
    constructor() {
        this.client = null;
        this.db = null;
    }

    async connect() {
        try {
            console.log('🔗 Conectando ao MongoDB...');
            this.client = new MongoClient(MONGO_URI);
            await this.client.connect();
            this.db = this.client.db();
            console.log('✅ Conectado ao MongoDB');
        } catch (error) {
            console.error('❌ Erro ao conectar ao MongoDB:', error);
            throw error;
        }
    }

    async disconnect() {
        if (this.client) {
            await this.client.close();
            console.log('🔌 Desconectado do MongoDB');
        }
    }

    async corrigirProblemas() {
        console.log('\n🔧 === CORREÇÃO DE PROBLEMAS ===\n');
        
        try {
            const chatExistente = await this.db.collection('chats').findOne({
                projectId: new ObjectId(PROJECT_ID),
                userId: new ObjectId(USER_ID)
            });

            if (!chatExistente) {
                console.log('📝 Criando chat para o projeto...');
                
                const projeto = await this.db.collection('projects').findOne({
                    _id: new ObjectId(PROJECT_ID)
                });

                if (projeto) {
                    const novoChat = {
                        _id: new ObjectId(),
                        userId: new ObjectId(USER_ID),
                        projectId: new ObjectId(PROJECT_ID),
                        title: `Chat - ${projeto.name}`,
                        messages: [],
                        isActive: true,
                        metadata: {
                            totalMessages: 0,
                            lastActivity: new Date(),
                            emailUpdates: 0
                        },
                        createdAt: new Date(),
                        updatedAt: new Date()
                    };

                    await this.db.collection('chats').insertOne(novoChat);
                    
                    await this.db.collection('projects').updateOne(
                        { _id: new ObjectId(PROJECT_ID) },
                        { $set: { chatId: novoChat._id } }
                    );

                    console.log('  ✅ Chat criado:', novoChat._id.toString());
                    console.log('  ✅ Projeto atualizado com chatId');
                }
            } else {
                console.log('  ✅ Chat já existe para o projeto');
                
                const projeto = await this.db.collection('projects').findOne({
                    _id: new ObjectId(PROJECT_ID)
                });

                if (projeto && !projeto.chatId) {
                    console.log('  🔧 Atualizando projeto com chatId...');
                    await this.db.collection('projects').updateOne(
                        { _id: new ObjectId(PROJECT_ID) },
                        { $set: { chatId: chatExistente._id } }
                    );
                    console.log('  ✅ Projeto atualizado');
                }
            }

            await this.corrigirProjetosSemChat();
            
        } catch (error) {
            console.error('❌ Erro durante correção:', error);
        }
    }

    async corrigirProjetosSemChat() {
        console.log('\n🔧 Corrigindo projetos sem chat...');
        
        try {
            const projetosSemChat = await this.db.collection('projects').find({
                userId: new ObjectId(USER_ID),
                $or: [
                    { chatId: { $exists: false } },
                    { chatId: null }
                ]
            }).toArray();

            console.log(`  📋 Encontrados ${projetosSemChat.length} projetos sem chat`);

            for (const projeto of projetosSemChat) {
                const chatExistente = await this.db.collection('chats').findOne({
                    projectId: projeto._id,
                    userId: new ObjectId(USER_ID)
                });

                if (chatExistente) {
                    await this.db.collection('projects').updateOne(
                        { _id: projeto._id },
                        { $set: { chatId: chatExistente._id } }
                    );
                    console.log(`    ✅ Projeto ${projeto.name} vinculado ao chat existente`);
                } else {
                    const novoChat = {
                        _id: new ObjectId(),
                        userId: new ObjectId(USER_ID),
                        projectId: projeto._id,
                        title: `Chat - ${projeto.name}`,
                        messages: [],
                        isActive: true,
                        metadata: {
                            totalMessages: 0,
                            lastActivity: new Date(),
                            emailUpdates: 0
                        },
                        createdAt: new Date(),
                        updatedAt: new Date()
                    };

                    await this.db.collection('chats').insertOne(novoChat);
                    
                    await this.db.collection('projects').updateOne(
                        { _id: projeto._id },
                        { $set: { chatId: novoChat._id } }
                    );
                    
                    console.log(`    ✅ Chat criado para projeto ${projeto.name}`);
                }
            }
        } catch (error) {
            console.error('  ❌ Erro ao corrigir projetos sem chat:', error);
        }
    }

    async executar() {
        try {
            await this.connect();
            await this.corrigirProblemas();
            console.log('\n🎉 Correção finalizada');
        } catch (error) {
            console.error('💥 Erro:', error);
        } finally {
            await this.disconnect();
        }
    }
}

if (require.main === module) {
    const fixer = new MailTrendzDebugger();
    fixer.executar().catch(console.error);
}

module.exports = MailTrendzDebugger;