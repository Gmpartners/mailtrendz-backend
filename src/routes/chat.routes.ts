import { Router } from 'express'
import { body, param, query } from 'express-validator'
import chatController from '../controllers/chat.controller'
import authMiddleware from '../middleware/auth.middleware'
import { rateLimitChat } from '../middleware/rate-limit.middleware'

const router = Router()

/**
 * ✅ ROTAS CHAT ATUALIZADAS - PYTHON AI SERVICE
 * Todas as rotas agora usam o Python AI Service integrado
 */

// ================================
// MIDDLEWARE APLICADO A TODAS AS ROTAS
// ================================
router.use(authMiddleware.authenticateToken)
router.use(rateLimitChat)

// ================================
// GERENCIAMENTO DE CHATS
// ================================

/**
 * @route POST /api/v1/chats
 * @desc Criar novo chat
 * @access Private
 */
router.post('/',
  [
    body('title')
      .isString()
      .isLength({ min: 1, max: 100 })
      .withMessage('Título deve ter entre 1 e 100 caracteres')
      .trim(),
    body('projectId')
      .optional()
      .isMongoId()
      .withMessage('ID do projeto inválido')
  ],
  chatController.createChat
)

/**
 * @route GET /api/v1/chats
 * @desc Obter chats do usuário com filtros
 * @access Private
 */
router.get('/',
  [
    query('projectId')
      .optional()
      .isMongoId()
      .withMessage('ID do projeto inválido'),
    query('isActive')
      .optional()
      .isBoolean()
      .withMessage('isActive deve ser boolean'),
    query('search')
      .optional()
      .isString()
      .isLength({ max: 100 })
      .withMessage('Busca deve ter no máximo 100 caracteres'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Página deve ser um número positivo'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit deve ser entre 1 e 100')
  ],
  chatController.getUserChats
)

/**
 * @route GET /api/v1/chats/active
 * @desc Obter chats ativos do usuário
 * @access Private
 */
router.get('/active', chatController.getActiveChats)

/**
 * @route GET /api/v1/chats/project/:projectId
 * @desc Obter chat por projeto
 * @access Private
 */
router.get('/project/:projectId',
  [
    param('projectId')
      .isMongoId()
      .withMessage('ID do projeto inválido')
  ],
  chatController.getChatByProject
)

/**
 * @route GET /api/v1/chats/:chatId
 * @desc Obter chat por ID
 * @access Private
 */
router.get('/:chatId',
  [
    param('chatId')
      .isMongoId()
      .withMessage('ID do chat inválido')
  ],
  chatController.getChatById
)

// ================================
// MENSAGENS
// ================================

/**
 * @route POST /api/v1/chats/:chatId/messages
 * @desc Enviar mensagem no chat (processada com Python AI Service)
 * @access Private
 */
router.post('/:chatId/messages',
  [
    param('chatId')
      .isMongoId()
      .withMessage('ID do chat inválido'),
    body('content')
      .isString()
      .isLength({ min: 1, max: 10000 })
      .withMessage('Conteúdo deve ter entre 1 e 10000 caracteres')
      .trim()
  ],
  chatController.sendMessage
)

/**
 * @route GET /api/v1/chats/:chatId/history
 * @desc Obter histórico de mensagens do chat
 * @access Private
 */
router.get('/:chatId/history',
  [
    param('chatId')
      .isMongoId()
      .withMessage('ID do chat inválido'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Página deve ser um número positivo'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit deve ser entre 1 e 100')
  ],
  chatController.getChatHistory
)

// ================================
// ATUALIZAÇÕES E GERENCIAMENTO
// ================================

/**
 * @route PUT /api/v1/chats/:chatId
 * @desc Atualizar chat
 * @access Private
 */
router.put('/:chatId',
  [
    param('chatId')
      .isMongoId()
      .withMessage('ID do chat inválido'),
    body('title')
      .optional()
      .isString()
      .isLength({ min: 1, max: 100 })
      .withMessage('Título deve ter entre 1 e 100 caracteres')
      .trim(),
    body('isActive')
      .optional()
      .isBoolean()
      .withMessage('isActive deve ser boolean')
  ],
  chatController.updateChat
)

/**
 * @route DELETE /api/v1/chats/:chatId
 * @desc Deletar chat
 * @access Private
 */
router.delete('/:chatId',
  [
    param('chatId')
      .isMongoId()
      .withMessage('ID do chat inválido')
  ],
  chatController.deleteChat
)

// ================================
// ANALYTICS E MONITORAMENTO
// ================================

/**
 * @route GET /api/v1/chats/:chatId/analytics
 * @desc Obter analytics do chat
 * @access Private
 */
router.get('/:chatId/analytics',
  [
    param('chatId')
      .isMongoId()
      .withMessage('ID do chat inválido')
  ],
  chatController.getChatAnalytics
)

/**
 * @route GET /api/v1/chats/system/python-ai-status
 * @desc Verificar status do Python AI Service
 * @access Private
 */
router.get('/system/python-ai-status', chatController.getPythonAIStatus)

// ================================
// ROTAS DE DESENVOLVIMENTO E TESTE
// ================================

if (process.env.NODE_ENV === 'development') {
  /**
   * @route POST /api/v1/chats/dev/test-message
   * @desc Testar mensagem com Python AI Service (apenas desenvolvimento)
   * @access Private
   */
  router.post('/dev/test-message',
    [
      body('message')
        .optional()
        .isString()
        .withMessage('Mensagem deve ser string')
    ],
    chatController.testMessage
  )

  /**
   * @route GET /api/v1/chats/dev/python-diagnostics
   * @desc Diagnósticos detalhados do Python AI Service
   * @access Private
   */
  router.get('/dev/python-diagnostics',
    async (req, res) => {
      try {
        const ChatService = require('../services/chat.service').default
        
        // Obter status detalhado
        const pythonStatus = await ChatService.getPythonAIStatus()
        
        // Informações do ambiente
        const environmentInfo = {
          nodeEnv: process.env.NODE_ENV,
          pythonAIUrl: process.env.PYTHON_AI_SERVICE_URL || 'http://localhost:5000',
          mongoUrl: process.env.MONGODB_URL ? '***configured***' : 'not configured',
          timestamp: new Date()
        }

        // Teste de conectividade básica
        let connectivityTest = 'not tested'
        try {
          const testResponse = await fetch(environmentInfo.pythonAIUrl)
          connectivityTest = testResponse.ok ? 'success' : `failed (${testResponse.status})`
        } catch (error: any) {
          connectivityTest = `error (${error.message})`
        }

        res.json({
          success: true,
          message: 'Diagnósticos do Python AI Service',
          data: {
            pythonAIStatus: pythonStatus,
            environment: environmentInfo,
            connectivityTest,
            recommendations: [
              pythonStatus.isHealthy ? '✅ Python AI Service funcionando' : '❌ Verificar Python AI Service',
              connectivityTest === 'success' ? '✅ Conectividade OK' : '❌ Problema de conectividade',
              '🔧 Use /dev/test-message para testar processamento completo',
              '📊 Use /system/python-ai-status para monitoramento contínuo'
            ]
          }
        })
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: error.message,
          timestamp: new Date()
        })
      }
    }
  )

  /**
   * @route POST /api/v1/chats/dev/simulate-conversation
   * @desc Simular conversa completa (apenas desenvolvimento)
   * @access Private
   */
  router.post('/dev/simulate-conversation',
    async (req, res) => {
      try {
        const { messages = ['Olá', 'Crie um email de promoção', 'Mude as cores para azul'] } = req.body
        const userId = (req as any).user?.userId || 'dev-user'
        
        const results = []
        
        // Simular conversa sequencial
        for (const message of messages) {
          try {
            const startTime = Date.now()
            
            // Simular envio de mensagem
            const testContext = {
              userId,
              projectName: 'Teste Simulação',
              type: 'newsletter',
              industry: 'tecnologia'
            }

            // Aqui você chamaria o chat service real
            // const response = await ChatService.sendMessage('simulation-chat', userId, { content: message })
            
            const processingTime = Date.now() - startTime
            
            results.push({
              userMessage: message,
              aiResponse: `Resposta simulada para: "${message}"`,
              processingTime,
              success: true
            })
            
            // Pequena pausa entre mensagens
            await new Promise(resolve => setTimeout(resolve, 100))
            
          } catch (error: any) {
            results.push({
              userMessage: message,
              aiResponse: null,
              error: error.message,
              success: false
            })
          }
        }

        res.json({
          success: true,
          message: 'Simulação de conversa concluída',
          data: {
            totalMessages: messages.length,
            results,
            summary: {
              successful: results.filter(r => r.success).length,
              failed: results.filter(r => !r.success).length,
              avgProcessingTime: results
                .filter(r => r.success)
                .reduce((acc, r) => acc + (r.processingTime || 0), 0) / results.filter(r => r.success).length
            }
          }
        })
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: error.message
        })
      }
    }
  )
}

export default router
