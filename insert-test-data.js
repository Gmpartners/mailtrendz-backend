const mongoose = require('mongoose');
require('dotenv').config();

async function insertTestData() {
  console.log('🧪 Inserindo dados de teste...');
  
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    
    console.log('✅ Conectado ao MongoDB local');
    
    const db = mongoose.connection.db;
    
    // Limpar dados existentes
    await db.collection('projects').deleteMany({});
    await db.collection('chats').deleteMany({});
    await db.collection('users').deleteMany({});
    console.log('🧹 Dados antigos removidos');
    
    // Criar usuário de teste
    const userId = new mongoose.Types.ObjectId('68450da093b2489ffc50d685');
    const user = {
      _id: userId,
      email: 'test@mailtrendz.com',
      name: 'Usuário Teste',
      password: '$2b$10$hashed_password',
      isVerified: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await db.collection('users').insertOne(user);
    console.log('👤 Usuário criado:', user.email);
    
    // Criar projeto de teste (exatamente como no documento MongoDB original)
    const projectId = new mongoose.Types.ObjectId('68476981e433b220d31b08ca');
    const chatId = new mongoose.Types.ObjectId('68476981e433b220d31b08cc');
    
    const project = {
      _id: projectId,
      userId: userId,
      name: "Email Projetar Email Promocional",
      description: "Projeto gerado a partir do prompt: Projetar um email promocional para Black Friday...",
      type: "newsletter",
      status: "draft",
      content: {
        html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #3b82f6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #ddd; }
        .cta { background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
        .footer { background: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 8px 8px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Newsletter</h1>
        </div>
        <div class="content">
            <p>Olá!</p>
            <p>Aqui estão as últimas novidades sobre projetar que preparamos para você.</p>
            <p>Criamos este email especialmente baseado na sua solicitação.</p>
            <p>Não perca as tendências e insights mais importantes do setor.</p>
            <a href="#" class="cta">Ler Mais</a>
            <p>Atenciosamente,<br>Equipe MailTrendz</p>
        </div>
        <div class="footer">
            <p>Este email foi gerado automaticamente pela IA do MailTrendz</p>
            <p>© 2024 MailTrendz. Todos os direitos reservados.</p>
        </div>
    </div>
</body>
</html>`,
        text: `Olá!

Esperamos que esteja bem. 

Criamos este email especialmente baseado na sua solicitação.

Estamos animados em compartilhar informações sobre projetar com você.

Para mais informações, visite nosso site ou entre em contato conosco.

Atenciosamente,
Equipe MailTrendz

---
Este email foi gerado automaticamente pela IA do MailTrendz
© 2024 MailTrendz. Todos os direitos reservados.`,
        subject: "Atualizações importantes",
        previewText: "Atualizações importantes - Confira todos os detalhes dentro."
      },
      metadata: {
        industry: "geral",
        targetAudience: "Geral",
        tone: "profissional",
        originalPrompt: "Projetar um email promocional para Black Friday",
        version: 1
      },
      stats: {
        opens: 0,
        clicks: 0,
        uses: 1,
        views: 0
      },
      tags: ["newsletter", "email"],
      color: "#3b82f6",
      isPublic: false,
      chatId: chatId,
      createdAt: new Date("2025-06-09T23:08:49.853Z"),
      updatedAt: new Date("2025-06-09T23:08:49.996Z"),
      __v: 0
    };
    
    await db.collection('projects').insertOne(project);
    console.log('📋 Projeto criado:', project.name);
    
    // Criar chat de teste
    const chat = {
      _id: chatId,
      userId: userId,
      projectId: projectId,
      title: `Chat - ${project.name}`,
      messages: [],
      isActive: true,
      metadata: {
        totalMessages: 0,
        lastActivity: new Date(),
        emailUpdates: 0
      },
      createdAt: new Date("2025-06-09T23:08:49.853Z"),
      updatedAt: new Date("2025-06-09T23:08:49.996Z"),
      __v: 0
    };
    
    await db.collection('chats').insertOne(chat);
    console.log('💬 Chat criado:', chat.title);
    
    // Criar alguns projetos adicionais para parecer mais real
    const additionalProjects = [
      {
        _id: new mongoose.Types.ObjectId(),
        userId: userId,
        name: "Newsletter Semanal",
        description: "Newsletter informativa semanal",
        type: "newsletter",
        status: "published",
        content: {
          html: "<div>Newsletter semanal</div>",
          text: "Newsletter semanal",
          subject: "Newsletter Semanal",
          previewText: "Suas atualizações semanais"
        },
        metadata: {
          industry: "tecnologia",
          targetAudience: "Desenvolvedores",
          tone: "informal",
          originalPrompt: "Criar newsletter semanal para desenvolvedores",
          version: 1
        },
        stats: { opens: 15, clicks: 3, uses: 1, views: 8 },
        tags: ["newsletter", "semanal"],
        color: "#10b981",
        isPublic: false,
        createdAt: new Date(Date.now() - 86400000),
        updatedAt: new Date(Date.now() - 86400000)
      },
      {
        _id: new mongoose.Types.ObjectId(),
        userId: userId,
        name: "Campanha Black Friday",
        description: "Email promocional para Black Friday",
        type: "campaign",
        status: "draft",
        content: {
          html: "<div>Black Friday</div>",
          text: "Black Friday",
          subject: "Black Friday - 50% OFF",
          previewText: "Ofertas imperdíveis"
        },
        metadata: {
          industry: "e-commerce",
          targetAudience: "Clientes",
          tone: "promocional",
          originalPrompt: "Email para Black Friday com desconto de 50%",
          version: 1
        },
        stats: { opens: 0, clicks: 0, uses: 1, views: 2 },
        tags: ["campanha", "promocional"],
        color: "#ef4444",
        isPublic: false,
        createdAt: new Date(Date.now() - 172800000),
        updatedAt: new Date(Date.now() - 172800000)
      }
    ];
    
    for (const additionalProject of additionalProjects) {
      // Criar chat para cada projeto adicional
      const additionalChatId = new mongoose.Types.ObjectId();
      await db.collection('projects').updateOne(
        { _id: additionalProject._id },
        { $set: { chatId: additionalChatId } }
      );
      
      const additionalChat = {
        _id: additionalChatId,
        userId: userId,
        projectId: additionalProject._id,
        title: `Chat - ${additionalProject.name}`,
        messages: [],
        isActive: true,
        metadata: {
          totalMessages: 0,
          lastActivity: new Date(),
          emailUpdates: 0
        },
        createdAt: additionalProject.createdAt,
        updatedAt: additionalProject.updatedAt
      };
      
      await db.collection('projects').insertOne(additionalProject);
      await db.collection('chats').insertOne(additionalChat);
    }
    
    console.log('📋 Projetos adicionais criados:', additionalProjects.length);
    
    // Verificar dados inseridos
    const projectCount = await db.collection('projects').countDocuments({ userId });
    const chatCount = await db.collection('chats').countDocuments({ userId });
    
    console.log('\n✅ Dados de teste inseridos com sucesso!');
    console.log(`📊 Resumo:`);
    console.log(`  - Usuários: 1`);
    console.log(`  - Projetos: ${projectCount}`);
    console.log(`  - Chats: ${chatCount}`);
    console.log(`\n🎯 IDs importantes:`);
    console.log(`  - User ID: ${userId}`);
    console.log(`  - Project ID: ${projectId}`);
    console.log(`  - Chat ID: ${chatId}`);
    
    await mongoose.disconnect();
    console.log('🔌 Desconectado do MongoDB');
    
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

insertTestData();