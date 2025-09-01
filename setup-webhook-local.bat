@echo off
echo 🚀 Configurando webhook local para desenvolvimento...
echo.
echo 📋 INSTRUÇÕES:
echo 1. Certifique-se de que seu backend está rodando na porta 8001
echo 2. Este script vai configurar um webhook temporário via Stripe CLI
echo 3. Copie o webhook secret que aparecerá e atualize seu .env
echo.
pause

echo 🔧 Iniciando Stripe CLI webhook forwarding...
echo 📡 URL do webhook: localhost:8001/api/v1/webhooks/stripe
echo 📋 Eventos configurados:
echo   - checkout.session.completed
echo   - customer.subscription.created
echo   - customer.subscription.updated  
echo   - customer.subscription.deleted
echo   - invoice.payment_succeeded
echo   - invoice.payment_failed
echo   - invoice.upcoming
echo   - customer.created
echo.

stripe listen --forward-to localhost:8001/api/v1/webhooks/stripe --events checkout.session.completed,customer.subscription.created,customer.subscription.updated,customer.subscription.deleted,invoice.payment_succeeded,invoice.payment_failed,invoice.upcoming,customer.created

pause