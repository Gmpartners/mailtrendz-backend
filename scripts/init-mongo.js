// Criar usuário para a aplicação
db = db.getSiblingDB('mailtrendz');

db.createUser({
  user: 'mailtrendz_user',
  pwd: 'mailtrendz_pass',
  roles: [
    {
      role: 'readWrite',
      db: 'mailtrendz'
    }
  ]
});

// Criar coleções básicas
db.createCollection('users');
db.createCollection('projects');
db.createCollection('chats');

print('Database initialized successfully');
