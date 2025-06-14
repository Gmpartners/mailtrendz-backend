const express = require('express');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const port = parseInt(process.env.PORT || '10000');

// Middleware básico
app.use(express.json());

// Rota de teste básica
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'MailTrendz Debug Server',
    timestamp: new Date(),
    port: port,
    env: process.env.NODE_ENV
  });
});

// Teste das rotas API
app.get('/api/v1', (req, res) => {
  res.json({
    success: true,
    message: 'API v1 funcionando',
    endpoints: {
      auth: '/api/v1/auth',
      login: '/api/v1/auth/login'
    }
  });
});

// Rota de login simples
app.post('/api/v1/auth/login', (req, res) => {
  res.json({
    success: false,
    message: 'Endpoint de login funcionando - teste OK'
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'ok',
    timestamp: new Date()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Rota não encontrada: ${req.originalUrl}`,
    method: req.method
  });
});

app.listen(port, () => {
  console.log(`🚀 Debug server rodando na porta ${port}`);
  console.log(`📡 URL: http://localhost:${port}`);
});
