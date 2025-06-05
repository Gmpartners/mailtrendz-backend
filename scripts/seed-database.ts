import dotenv from 'dotenv'
import mongoose from 'mongoose'
import { User } from '../src/models/User.model'
import { Project } from '../src/models/Project.model'
import { Chat } from '../src/models/Chat.model'
import { Message } from '../src/models/Message.model'
import Database from '../src/config/database.config'
import { logger } from '../src/utils/logger'

dotenv.config()

async function seedDatabase() {
  try {
    logger.info('🌱 Starting database seed...')
    
    // Conectar ao banco
    await Database.connect()
    
    // Limpar dados existentes
    await Promise.all([
      User.deleteMany({}),
      Project.deleteMany({}),
      Chat.deleteMany({}),
      Message.deleteMany({})
    ])
    
    logger.info('🗑️ Existing data cleared')
    
    // Criar usuário de teste
    const testUser = new User({
      name: 'Gabriel Teste',
      email: 'gabriel@teste.com',
      password: 'MinhaSenh@123',
      isEmailVerified: true,
      subscription: 'pro'
    })
    
    await testUser.save()
    logger.info('👤 Test user created:', testUser.email)
    
    // Criar projetos de exemplo
    const sampleProjects = [
      {
        userId: testUser._id,
        name: 'Email de Boas-vindas SaaS',
        description: 'Email de boas-vindas para novos usuários de plataforma SaaS',
        type: 'welcome',
        content: {
          subject: 'Bem-vindo ao futuro! 🚀',
          previewText: 'Sua jornada para 10x produtividade começa agora',
          html: '<div style="font-family: Arial, sans-serif;"><h1>Bem-vindo!</h1><p>Estamos animados em tê-lo conosco!</p></div>',
          text: 'Bem-vindo! Estamos animados em tê-lo conosco!'
        },
        metadata: {
          industry: 'Tecnologia',
          targetAudience: 'Desenvolvedores',
          tone: 'Entusiasmado',
          originalPrompt: 'Criar email de boas-vindas para desenvolvedores se juntando a nossa plataforma'
        },
        tags: ['Boas-vindas', 'SaaS', 'Desenvolvedores'],
        color: '#10b981'
      },
      {
        userId: testUser._id,
        name: 'Promoção Black Friday',
        description: 'Email promocional para Black Friday com desconto especial',
        type: 'promotional',
        content: {
          subject: 'Black Friday: 50% OFF! ⚡',
          previewText: 'Oferta por tempo limitado - não perca!',
          html: '<div style="font-family: Arial, sans-serif;"><h1>Black Friday!</h1><p>50% de desconto em todos os planos!</p></div>',
          text: 'Black Friday! 50% de desconto em todos os planos!'
        },
        metadata: {
          industry: 'E-commerce',
          targetAudience: 'Clientes existentes',
          tone: 'Urgente',
          originalPrompt: 'Email promocional Black Friday com 50% desconto'
        },
        tags: ['Black Friday', 'Promoção', 'Desconto'],
        color: '#f59e0b'
      }
    ]
    
    const createdProjects = await Project.insertMany(sampleProjects)
    logger.info(`📧 ${createdProjects.length} sample projects created`)
    
    // Criar chats para os projetos
    for (const project of createdProjects) {
      const chat = new Chat({
        userId: testUser._id,
        projectId: project._id,
        title: `Chat - ${project.name}`,
        isActive: true
      })
      
      await chat.save()
      
      // Atualizar projeto com chat ID
      await Project.findByIdAndUpdate(project._id, { chatId: chat._id })
      
      // Criar algumas mensagens de exemplo
      const sampleMessages = [
        {
          chatId: chat._id,
          type: 'user',
          content: 'Oi! Gostaria de melhorar o assunto deste email.'
        },
        {
          chatId: chat._id,
          type: 'ai',
          content: 'Claro! Vou ajudar você a criar um assunto mais impactante. Qual é o objetivo principal deste email?',
          metadata: {
            emailUpdated: false,
            suggestions: ['Usar números específicos', 'Adicionar emoji', 'Criar urgência']
          }
        },
        {
          chatId: chat._id,
          type: 'user',
          content: 'Quero que seja mais chamativo e gere mais cliques.'
        },
        {
          chatId: chat._id,
          type: 'ai',
          content: 'Perfeito! Vou otimizar o assunto para aumentar a taxa de abertura. O novo assunto será mais específico e incluirá elementos de urgência.',
          metadata: {
            emailUpdated: true,
            suggestions: ['Testar A/B', 'Personalizar por segmento']
          }
        }
      ]
      
      const messages = await Message.insertMany(sampleMessages)
      
      // Atualizar chat com mensagens
      chat.messages = messages.map(m => m._id)
      chat.metadata.totalMessages = messages.length
      chat.metadata.emailUpdates = 1
      await chat.save()
      
      logger.info(`💬 Chat created for project: ${project.name}`)
    }
    
    logger.info('✅ Database seeding completed successfully!')
    logger.info('📊 Summary:')
    logger.info(`   Users: ${await User.countDocuments()}`)
    logger.info(`   Projects: ${await Project.countDocuments()}`)
    logger.info(`   Chats: ${await Chat.countDocuments()}`)
    logger.info(`   Messages: ${await Message.countDocuments()}`)
    
    logger.info('🔑 Test credentials:')
    logger.info('   Email: gabriel@teste.com')
    logger.info('   Password: MinhaSenh@123')
    
  } catch (error) {
    logger.error('❌ Database seeding failed:', error)
    throw error
  } finally {
    await Database.disconnect()
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  seedDatabase()
    .then(() => {
      logger.info('🎉 Seeding process completed')
      process.exit(0)
    })
    .catch((error) => {
      logger.error('💥 Seeding process failed:', error)
      process.exit(1)
    })
}

export default seedDatabase