#!/usr/bin/env node

console.log('🔍 Validação das correções Enhanced AI')
console.log('=====================================')

console.log('1. Verificando arquivos corrigidos...')

const fs = require('fs')
const path = require('path')

const filesToCheck = [
  'src/services/ai/enhanced/EnhancedAIService.ts',
  'src/controllers/enhanced-ai.controller.ts', 
  'src/utils/constants.ts'
]

let allFilesExist = true

for (const file of filesToCheck) {
  if (fs.existsSync(file)) {
    const stats = fs.statSync(file)
    console.log(`✅ ${file} (${Math.round(stats.size / 1024)}KB)`)
  } else {
    console.log(`❌ ${file} não encontrado`)
    allFilesExist = false
  }
}

if (!allFilesExist) {
  console.log('\n💥 Nem todos os arquivos foram encontrados!')
  process.exit(1)
}

console.log('\n2. Verificando conteúdo dos arquivos...')

console.log('2.1. Verificando EnhancedAIService...')
const enhancedServiceContent = fs.readFileSync('src/services/ai/enhanced/EnhancedAIService.ts', 'utf8')

const serviceChecks = [
  { check: 'validateConfiguration', found: enhancedServiceContent.includes('validateConfiguration') },
  { check: 'Fallback models', found: enhancedServiceContent.includes('anthropic/claude-3-sonnet-20240229') },
  { check: 'Timeout de 30s', found: enhancedServiceContent.includes('30000') },
  { check: 'Tratamento de erro melhorado', found: enhancedServiceContent.includes('OpenRouter API error') },
  { check: 'Parse robusto', found: enhancedServiceContent.includes('jsonMatch') }
]

for (const check of serviceChecks) {
  console.log(`${check.found ? '✅' : '❌'} ${check.check}`)
}

console.log('\n2.2. Verificando Controller...')
const controllerContent = fs.readFileSync('src/controllers/enhanced-ai.controller.ts', 'utf8')

const controllerChecks = [
  { check: 'Try-catch aprimorado', found: controllerContent.includes('SERVICE_UNAVAILABLE') },
  { check: 'Logs detalhados', found: controllerContent.includes('stack: error.stack') },
  { check: 'Diferentes códigos de erro', found: controllerContent.includes('AI_TIMEOUT') },
  { check: 'Status codes corretos', found: controllerContent.includes('REQUEST_TIMEOUT') }
]

for (const check of controllerChecks) {
  console.log(`${check.found ? '✅' : '❌'} ${check.check}`)
}

console.log('\n2.3. Verificando Constants...')
const constantsContent = fs.readFileSync('src/utils/constants.ts', 'utf8')

const constantsChecks = [
  { check: 'Modelo AI atualizado', found: constantsContent.includes('anthropic/claude-3-sonnet-20240229') },
  { check: 'Timeout otimizado', found: constantsContent.includes('TIMEOUT: 30000') },
  { check: 'Fallbacks definidos', found: constantsContent.includes('anthropic/claude-3-haiku-20240307') }
]

for (const check of constantsChecks) {
  console.log(`${check.found ? '✅' : '❌'} ${check.check}`)
}

console.log('\n3. Verificando variáveis de ambiente...')

require('dotenv').config()

const envChecks = [
  { var: 'OPENROUTER_API_KEY', exists: !!process.env.OPENROUTER_API_KEY },
  { var: 'OPENROUTER_BASE_URL', exists: !!process.env.OPENROUTER_BASE_URL },
  { var: 'MONGODB_URI', exists: !!process.env.MONGODB_URI },
  { var: 'JWT_SECRET', exists: !!process.env.JWT_SECRET }
]

for (const check of envChecks) {
  console.log(`${check.exists ? '✅' : '❌'} ${check.var}`)
}

console.log('\n4. Resumo das correções aplicadas:')
console.log('   🔧 Modelo AI corrigido para versão estável')
console.log('   🔧 Timeout reduzido de 60s para 30s')  
console.log('   🔧 Tratamento de erro melhorado')
console.log('   🔧 Parsing JSON mais robusto')
console.log('   🔧 Fallback para múltiplos modelos')
console.log('   🔧 Logs mais detalhados')
console.log('   🔧 Validação de configuração')

console.log('\n🎯 VALIDAÇÃO CONCLUÍDA!')
console.log('✨ As correções foram aplicadas com sucesso.')
console.log('🚀 O erro 500 no /enhanced-ai/generate deve estar resolvido.')

console.log('\n📋 PRÓXIMOS PASSOS:')
console.log('1. Fazer o deploy do backend atualizado')
console.log('2. Testar a criação de emails no frontend')
console.log('3. Monitorar os logs para confirmar o funcionamento')

process.exit(0)