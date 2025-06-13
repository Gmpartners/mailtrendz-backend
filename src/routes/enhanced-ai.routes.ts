import { Router } from 'express'
import { body } from 'express-validator'
import aiController from '../controllers/ai.controller'
import authMiddleware from '../middleware/auth.middleware'
import { rateLimitAI } from '../middleware/rate-limit.middleware'

const router = Router()

router.use(authMiddleware.authenticateToken)
router.use(rateLimitAI)

router.post('/generate',
  [
    body('prompt').isString().isLength({ min: 5, max: 2000 }),
    body('context').optional().isObject()
  ],
  aiController.generateEmail
)

router.post('/chat',
  [
    body('message').isString().isLength({ min: 1, max: 1000 }),
    body('chatHistory').optional().isArray()
  ],
  aiController.chatWithAI
)

router.post('/analyze',
  [
    body('content').isString().isLength({ min: 10 })
  ],
  aiController.validateEmailHTML
)

router.post('/compare',
  [
    body('contentA').isString().isLength({ min: 10 }),
    body('contentB').isString().isLength({ min: 10 })
  ],
  aiController.improveEmail
)

router.get('/status', aiController.getAIServiceStatus)

export default router
