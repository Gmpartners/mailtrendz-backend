// ✅ SCRIPT DE INICIALIZAÇÃO DO MONGODB
// Configuração inicial do banco de dados MailTrendz

// Conectar ao banco de dados
db = db.getSiblingDB('mailtrendz');

// Criar usuário específico para a aplicação
db.createUser({
  user: 'mailtrendz_user',
  pwd: 'mailtrendz_password_2024',
  roles: [
    {
      role: 'readWrite',
      db: 'mailtrendz'
    }
  ]
});

// Criar collections com validação
db.createCollection('users', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['name', 'email', 'password'],
      properties: {
        name: {
          bsonType: 'string',
          description: 'Nome do usuário é obrigatório'
        },
        email: {
          bsonType: 'string',
          pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
          description: 'Email deve ser válido'
        },
        password: {
          bsonType: 'string',
          minLength: 60,
          description: 'Password hash é obrigatório'
        },
        subscription: {
          bsonType: 'string',
          enum: ['free', 'pro', 'enterprise'],
          description: 'Tipo de assinatura'
        }
      }
    }
  }
});

db.createCollection('projects', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['userId', 'name', 'description', 'type', 'content'],
      properties: {
        userId: {
          bsonType: 'objectId',
          description: 'ID do usuário é obrigatório'
        },
        name: {
          bsonType: 'string',
          minLength: 3,
          maxLength: 100,
          description: 'Nome do projeto deve ter entre 3 e 100 caracteres'
        },
        type: {
          bsonType: 'string',
          enum: ['welcome', 'newsletter', 'campaign', 'promotional', 'announcement', 'follow-up'],
          description: 'Tipo de projeto'
        },
        content: {
          bsonType: 'object',
          required: ['html', 'subject'],
          properties: {
            html: {
              bsonType: 'string',
              description: 'HTML do email é obrigatório'
            },
            subject: {
              bsonType: 'string',
              description: 'Assunto do email é obrigatório'
            }
          }
        }
      }
    }
  }
});

db.createCollection('chats', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['userId', 'title'],
      properties: {
        userId: {
          bsonType: 'objectId',
          description: 'ID do usuário é obrigatório'
        },
        title: {
          bsonType: 'string',
          minLength: 1,
          maxLength: 100,
          description: 'Título do chat é obrigatório'
        },
        isActive: {
          bsonType: 'bool',
          description: 'Status ativo do chat'
        }
      }
    }
  }
});

db.createCollection('chatmessages', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['chatId', 'type', 'content'],
      properties: {
        chatId: {
          bsonType: 'objectId',
          description: 'ID do chat é obrigatório'
        },
        type: {
          bsonType: 'string',
          enum: ['user', 'ai', 'system'],
          description: 'Tipo da mensagem'
        },
        content: {
          bsonType: 'string',
          minLength: 1,
          description: 'Conteúdo da mensagem é obrigatório'
        }
      }
    }
  }
});

// Criar índices para performance
print('Criando índices...');

// Índices para users
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ subscription: 1 });
db.users.createIndex({ createdAt: -1 });

// Índices para projects
db.projects.createIndex({ userId: 1, createdAt: -1 });
db.projects.createIndex({ userId: 1, type: 1 });
db.projects.createIndex({ userId: 1, status: 1 });
db.projects.createIndex({ tags: 1 });
db.projects.createIndex({ 'metadata.industry': 1 });
db.projects.createIndex({ isPublic: 1, createdAt: -1 });

// Índice de texto para busca
db.projects.createIndex(
  { 
    name: 'text', 
    description: 'text', 
    'metadata.originalPrompt': 'text' 
  },
  {
    weights: {
      name: 10,
      description: 5,
      'metadata.originalPrompt': 1
    },
    name: 'projects_text_search'
  }
);

// Índices para chats
db.chats.createIndex({ userId: 1, createdAt: -1 });
db.chats.createIndex({ userId: 1, isActive: 1 });
db.chats.createIndex({ projectId: 1 }, { sparse: true });
db.chats.createIndex({ 'metadata.lastActivity': -1 });

// Índices para chatmessages
db.chatmessages.createIndex({ chatId: 1, createdAt: 1 });
db.chatmessages.createIndex({ type: 1 });
db.chatmessages.createIndex({ createdAt: -1 });
db.chatmessages.createIndex({ 'metadata.emailUpdated': 1 }, { sparse: true });

// Índices para refresh_tokens
db.refresh_tokens.createIndex({ userId: 1 });
db.refresh_tokens.createIndex({ token: 1 }, { unique: true });
db.refresh_tokens.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Inserir dados de exemplo para desenvolvimento
if (db.getName() === 'mailtrendz' && db.runCommand('ismaster').ismaster) {
  print('Inserindo dados de exemplo...');
  
  // Usuário de exemplo (senha: password123)
  const exampleUserId = new ObjectId();
  db.users.insertOne({
    _id: exampleUserId,
    name: 'Usuário Exemplo',
    email: 'exemplo@mailtrendz.com',
    password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeaJqQ5qQ5qQ5qQ5q', // password123
    subscription: 'pro',
    isEmailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date()
  });
  
  // Projeto de exemplo
  const exampleProjectId = new ObjectId();
  db.projects.insertOne({
    _id: exampleProjectId,
    userId: exampleUserId,
    name: 'Newsletter Tecnologia',
    description: 'Newsletter semanal sobre tecnologia e inovação',
    type: 'newsletter',
    status: 'active',
    content: {
      html: '<h1>Newsletter de Tecnologia</h1><p>Bem-vindo à nossa newsletter semanal!</p>',
      text: 'Newsletter de Tecnologia\n\nBem-vindo à nossa newsletter semanal!',
      subject: 'Newsletter Semanal - Tecnologia e Inovação',
      previewText: 'As últimas novidades do mundo tech'
    },
    metadata: {
      industry: 'tecnologia',
      tone: 'professional',
      originalPrompt: 'Crie uma newsletter sobre tecnologia',
      version: 1
    },
    stats: {
      opens: 0,
      clicks: 0,
      uses: 1,
      views: 0
    },
    tags: ['tecnologia', 'newsletter', 'semanal'],
    color: '#3b82f6',
    isPublic: false,
    createdAt: new Date(),
    updatedAt: new Date()
  });
  
  // Chat de exemplo
  const exampleChatId = new ObjectId();
  db.chats.insertOne({
    _id: exampleChatId,
    userId: exampleUserId,
    projectId: exampleProjectId,
    title: 'Chat - Newsletter Tecnologia',
    isActive: true,
    metadata: {
      totalMessages: 2,
      emailUpdates: 1,
      lastActivity: new Date(),
      createdBy: 'auto-generated',
      version: '2.0.0-python-service',
      pythonAIEnabled: true
    },
    createdAt: new Date(),
    updatedAt: new Date()
  });
  
  // Mensagens de exemplo
  db.chatmessages.insertMany([
    {
      chatId: exampleChatId,
      type: 'user',
      content: 'Crie uma newsletter sobre as últimas tendências em IA',
      metadata: {
        timestamp: new Date()
      },
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      chatId: exampleChatId,
      type: 'ai',
      content: '✅ Newsletter sobre IA criada com sucesso! Incluí as principais tendências e inovações do setor.',
      metadata: {
        emailUpdated: true,
        model: 'python-ai-service',
        confidence: 0.95,
        pythonAIUsed: true,
        timestamp: new Date()
      },
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ]);
  
  print('Dados de exemplo inseridos com sucesso!');
}

print('Inicialização do MongoDB concluída!');
print('Collections criadas: users, projects, chats, chatmessages');
print('Índices criados para performance otimizada');
print('Sistema pronto para Python AI Service + Node.js API');
