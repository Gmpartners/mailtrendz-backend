import { CorsOptions } from 'cors'

const allowedOrigins = [
  // URLs de produção - CORRIGIDAS
  'https://mailtrendz-frontend.onrender.com',
  'https://mailtrendz-frontend-production.onrender.com',
  process.env.FRONTEND_URL,
  
  // URLs de desenvolvimento
  'http://localhost:5173',
  'http://localhost:5175', // Frontend Vite server
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5175', // Frontend Vite server (127.0.0.1)
  'http://127.0.0.1:3000'
].filter(Boolean) // Remove valores undefined/null

console.log('🌐 [CORS] URLs permitidas:', allowedOrigins)

export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    console.log('🔍 [CORS] Verificando origin:', origin)
    
    // ✅ Permitir requests sem origin (ex: mobile apps, Postman, health checks)
    if (!origin) {
      console.log('✅ [CORS] Request sem origin permitido')
      return callback(null, true)
    }
    
    // ✅ Verificar se origin está na lista permitida
    if (allowedOrigins.includes(origin)) {
      console.log('✅ [CORS] Origin permitido:', origin)
      callback(null, true)
    } else {
      console.log('❌ [CORS] Origin bloqueado:', origin)
      console.log('📋 [CORS] Origins permitidos:', allowedOrigins)
      callback(new Error(`Origin ${origin} not allowed by CORS policy`))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
    'Pragma',
    'X-API-Key',
    'X-Request-ID',
    'X-Service', // ✅ ADICIONADO: Header que estava causando o erro CORS
    'x-service', // ✅ ADICIONADO: Versão lowercase
    'X-Workspace-Context', // ✅ CORREÇÃO: Header para contexto de workspace
    'x-workspace-context', // ✅ CORREÇÃO: Versão lowercase
    'User-Agent',
    'Accept-Encoding',
    'Accept-Language',
    'Connection',
    'Host',
    'Referer',
    'X-Client-Version', // Headers adicionais que podem ser úteis
    'X-App-Version',
    'X-Platform'
  ],
  exposedHeaders: [
    'X-Total-Count',
    'X-Page-Count',
    'X-Current-Page',
    'X-Rate-Limit-Limit',
    'X-Rate-Limit-Remaining',
    'X-Rate-Limit-Reset',
    'X-Response-Time'
  ],
  maxAge: 86400, // 24 hours
  optionsSuccessStatus: 200 // Para suporte a browsers legados
}

export default corsOptions