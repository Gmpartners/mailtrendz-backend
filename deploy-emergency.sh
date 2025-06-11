#!/bin/bash
echo "🚀 Iniciando deploy de emergência..."

# Instalar dependências
npm install

# Build com configuração de emergência
npm run build:force

echo "✅ Deploy preparado!"
echo "📦 Arquivos compilados estão em ./dist/"
