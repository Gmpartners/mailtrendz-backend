/**
 * Utilitário para gerenciar URLs dinamicamente baseado no ambiente
 * Solução para problema de redirecionamento OAuth
 */

interface EnvironmentUrls {
  frontend: string
  backend: string
  isDevelopment: boolean
}

/**
 * Retorna URLs corretas baseadas no ambiente atual
 * 
 * @returns {EnvironmentUrls} URLs do frontend e backend + flag de desenvolvimento
 */
export const getEnvironmentUrls = (): EnvironmentUrls => {
  const isDevelopment = process.env.NODE_ENV === 'development'

  if (isDevelopment) {
    return {
      frontend: process.env.FRONTEND_URL || 'http://localhost:5173',
      backend: process.env.BACKEND_URL || 'http://localhost:8001',
      isDevelopment: true
    }
  }

  return {
    frontend: process.env.FRONTEND_URL || 'https://mailtrendz.com',
    backend: process.env.BACKEND_URL || 'https://api.mailtrendz.com',
    isDevelopment: false
  }
}

/**
 * Gera URL de redirecionamento OAuth para reset de senha
 * 
 * @param path - Caminho relativo (ex: '/reset-password')
 * @returns URL completa para redirecionamento
 */
export const getRedirectUrl = (path: string = ''): string => {
  const { frontend } = getEnvironmentUrls()
  return `${frontend}${path}`
}

/**
 * Gera URLs do Stripe baseadas no ambiente
 * 
 * @returns URLs de sucesso e cancelamento do Stripe
 */
export const getStripeUrls = () => {
  const { frontend } = getEnvironmentUrls()
  
  return {
    successUrl: `${frontend}/dashboard?success=true`,
    cancelUrl: `${frontend}/pricing?canceled=true`
  }
}

/**
 * Verifica se estamos em ambiente de desenvolvimento
 * 
 * @returns true se desenvolvimento, false se produção
 */
export const isDevelopmentEnvironment = (): boolean => {
  return process.env.NODE_ENV === 'development'
}

/**
 * Logs de debug para URLs (apenas em desenvolvimento)
 */
export const logEnvironmentUrls = (): void => {
  if (isDevelopmentEnvironment()) {
    const urls = getEnvironmentUrls()
    console.log('🌍 [URL-HELPER] Environment URLs:', {
      environment: process.env.NODE_ENV,
      frontend: urls.frontend,
      backend: urls.backend,
      isDevelopment: urls.isDevelopment
    })
  }
}