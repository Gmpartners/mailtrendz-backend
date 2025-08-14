#!/bin/bash
# 🚀 QUICK COMMANDS - Sistema de Requisições Mensais

echo "🎯 Comandos Rápidos - Sistema de Requisições Mensais"
echo "===================================================="

# Backend Commands
echo -e "\n📦 BACKEND COMMANDS:"
echo "cd \"C:\\Users\\Gabriel\\Desktop\\Backend - Mailtrendz\""
echo "npm install chalk                    # Instalar dependência"
echo "npm run migrate:monthly-usage        # Executar migração"
echo "npm run dev                         # Iniciar servidor desenvolvimento"

# Frontend Commands  
echo -e "\n🎨 FRONTEND COMMANDS:"
echo "cd \"C:\\Users\\Gabriel\\Desktop\\Frontend - MailTrendz\""
echo "npm install date-fns framer-motion  # Instalar dependências"
echo "npm run dev                         # Iniciar frontend"

# Test APIs
echo -e "\n🧪 TEST APIS (with curl):"
echo "# Get Monthly Usage"
echo "curl -H \"Authorization: Bearer YOUR_TOKEN\" http://localhost:8000/api/v1/subscriptions/monthly-usage"
echo ""
echo "# Check Limit"
echo "curl -H \"Authorization: Bearer YOUR_TOKEN\" http://localhost:8000/api/v1/subscriptions/check-limit"
echo ""
echo "# Get History" 
echo "curl -H \"Authorization: Bearer YOUR_TOKEN\" http://localhost:8000/api/v1/subscriptions/usage-history?months=6"
echo ""
echo "# Consume Credit"
echo "curl -X POST -H \"Authorization: Bearer YOUR_TOKEN\" -H \"Content-Type: application/json\" -d '{\"amount\":1}' http://localhost:8000/api/v1/subscriptions/consume-credits"

# SQL Queries
echo -e "\n💾 USEFUL SQL QUERIES (Supabase):"
echo "-- View current usage"
echo "SELECT * FROM user_current_usage;"
echo ""
echo "-- Check specific user"
echo "SELECT * FROM check_monthly_request_limit('USER_ID_HERE');"
echo ""
echo "-- View history"
echo "SELECT * FROM user_monthly_usage ORDER BY created_at DESC LIMIT 10;"
echo ""
echo "-- Reset user usage (testing)"
echo "UPDATE user_monthly_usage SET requests_used = 0 WHERE user_id = 'USER_ID_HERE' AND period_start >= CURRENT_DATE;"

# Git Commands
echo -e "\n📝 GIT COMMANDS:"
echo "git add -A"
echo "git commit -m \"feat: implement monthly request system\""
echo "git push origin main"

# Quick Test Flow
echo -e "\n⚡ QUICK TEST FLOW:"
echo "1. Start backend: npm run dev (port 8000)"
echo "2. Start frontend: npm run dev (port 5173)"  
echo "3. Login as test user"
echo "4. Create 3 emails (free plan limit)"
echo "5. Try 4th email - should show 402 error"
echo "6. Check UsageHistory component"

# Environment Check
echo -e "\n🔍 ENVIRONMENT CHECK:"
echo "Backend .env needs:"
echo "  - SUPABASE_URL"
echo "  - SUPABASE_SERVICE_ROLE_KEY" 
echo "  - STRIPE_SECRET_KEY"
echo ""
echo "Frontend .env needs:"
echo "  - VITE_API_URL=http://localhost:8000/api/v1"
echo "  - VITE_SUPABASE_URL"
echo "  - VITE_SUPABASE_ANON_KEY"

echo -e "\n✅ Sistema pronto para uso!"
echo "===================================================="
