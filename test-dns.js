const dns = require('dns');

// Configurar DNS do Google
dns.setServers(['8.8.8.8', '8.8.4.4']);

async function testDNS() {
  try {
    console.log('🔄 Testando resolução DNS...');
    
    // Testar DNS geral
    const googleResult = await dns.promises.lookup('google.com');
    console.log('✅ DNS geral funcionando:', googleResult);
    
    // Testar SRV record do MongoDB
    try {
      const srvResult = await dns.promises.resolveSrv('_mongodb._tcp.mailtrendz-cluster.699h6tl.mongodb.net');
      console.log('✅ SRV MongoDB encontrado:', srvResult);
    } catch (srvError) {
      console.log('❌ SRV MongoDB não encontrado:', srvError.message);
      
      // Tentar resolver o host direto
      try {
        const hostResult = await dns.promises.lookup('mailtrendz-cluster.699h6tl.mongodb.net');
        console.log('✅ Host MongoDB encontrado:', hostResult);
      } catch (hostError) {
        console.log('❌ Host MongoDB não encontrado:', hostError.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Erro no teste DNS:', error.message);
  }
}

testDNS();
