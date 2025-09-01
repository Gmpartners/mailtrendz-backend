const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Usar mesmas credenciais do seu .env
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
);

async function testDatabaseState() {
  console.log('🗄️ Verificando estado do banco de dados...');
  console.log('Supabase URL:', process.env.SUPABASE_URL);
  
  try {
    // Teste 1: Verificar dados do seu usuário
    console.log('\n1️⃣ Verificando dados do usuário Gabriel...');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', '9d8b1331-c611-4914-a8d3-449083d84b59')
      .single();
    
    if (profileError) {
      console.error('❌ Erro buscando profile:', profileError.message);
    } else {
      console.log('✅ Profile encontrado:');
      console.log('  Email:', profile.email);
      console.log('  Subscription:', profile.subscription);
      console.log('  Stripe Customer ID:', profile.stripe_customer_id || 'NULL');
      console.log('  Free Requests Used:', profile.free_requests_used);
      console.log('  Free Requests Limit:', profile.free_requests_limit);
      console.log('  Is Lifetime Free:', profile.is_lifetime_free);
    }
    
  } catch (error) {
    console.error('❌ Erro conectando ao Supabase:', error.message);
    return;
  }
  
  try {
    // Teste 2: Verificar subscription
    console.log('\n2️⃣ Verificando subscription do usuário...');
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', '9d8b1331-c611-4914-a8d3-449083d84b59')
      .single();
    
    if (subError) {
      console.error('❌ Erro buscando subscription:', subError.message);
    } else {
      console.log('✅ Subscription encontrada:');
      console.log('  Plan Type:', subscription.plan_type);
      console.log('  Status:', subscription.status);
      console.log('  Stripe Customer ID:', subscription.stripe_customer_id || 'NULL');
      console.log('  Stripe Subscription ID:', subscription.stripe_subscription_id || 'NULL');
      console.log('  Created:', subscription.created_at);
      console.log('  Updated:', subscription.updated_at);
    }
    
  } catch (error) {
    console.error('❌ Erro buscando subscription:', error.message);
  }
  
  try {
    // Teste 3: Verificar webhook events
    console.log('\n3️⃣ Verificando webhook events processados...');
    const { data: webhooks, error: webhookError } = await supabase
      .from('webhook_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (webhookError) {
      console.error('❌ Erro buscando webhooks:', webhookError.message);
    } else if (webhooks.length === 0) {
      console.log('⚠️ Nenhum webhook event processado');
    } else {
      console.log(`✅ Últimos ${webhooks.length} webhook events:`);
      webhooks.forEach((webhook, index) => {
        console.log(`  ${index + 1}. Type: ${webhook.event_type}`);
        console.log(`     Stripe Event ID: ${webhook.stripe_event_id}`);
        console.log(`     Processed: ${webhook.processed}`);
        console.log(`     Created: ${webhook.created_at}`);
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('❌ Erro buscando webhook events:', error.message);
  }
  
  try {
    // Teste 4: Verificar usuários com subscription unlimited
    console.log('\n4️⃣ Verificando usuários com plano unlimited...');
    const { data: unlimitedUsers, error: unlimitedError } = await supabase
      .from('profiles')
      .select('email, subscription, stripe_customer_id')
      .eq('subscription', 'unlimited');
    
    if (unlimitedError) {
      console.error('❌ Erro buscando usuarios unlimited:', unlimitedError.message);
    } else if (unlimitedUsers.length === 0) {
      console.log('⚠️ Nenhum usuário com plano unlimited encontrado');
    } else {
      console.log(`✅ ${unlimitedUsers.length} usuário(s) com plano unlimited:`);
      unlimitedUsers.forEach((user, index) => {
        console.log(`  ${index + 1}. ${user.email} (Customer: ${user.stripe_customer_id || 'NULL'})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erro buscando usuarios unlimited:', error.message);
  }
  
  try {
    // Teste 5: Verificar constraints da tabela subscriptions
    console.log('\n5️⃣ Verificando constraints da tabela subscriptions...');
    const { data: constraints, error: constraintError } = await supabase
      .rpc('get_table_constraints', { table_name: 'subscriptions' });
    
    if (constraintError) {
      console.log('⚠️ Não foi possível verificar constraints automaticamente');
    } else {
      console.log('✅ Constraints encontradas:', constraints);
    }
    
  } catch (error) {
    console.log('⚠️ Skip verificação de constraints:', error.message);
  }
}

// Executar verificação
testDatabaseState().then(() => {
  console.log('\n🏁 Verificação do banco finalizada');
  process.exit(0);
}).catch(error => {
  console.error('\n💥 Erro inesperado:', error);
  process.exit(1);
});