const { exec } = require('child_process');

const port = process.argv[2] || 8000;

console.log(`🔍 Procurando processo na porta ${port}...`);

// Windows command to find and kill process on port
const findCommand = `netstat -ano | findstr :${port}`;

exec(findCommand, (error, stdout, stderr) => {
  if (error) {
    console.log(`✅ Nenhum processo encontrado na porta ${port}`);
    return;
  }

  const lines = stdout.split('\n').filter(line => line.trim() !== '');
  const pids = new Set();

  lines.forEach(line => {
    const parts = line.trim().split(/\s+/);
    if (parts.length >= 5) {
      const pid = parts[parts.length - 1];
      if (pid && pid !== '0' && !isNaN(pid)) {
        pids.add(pid);
      }
    }
  });

  if (pids.size === 0) {
    console.log(`✅ Nenhum processo encontrado na porta ${port}`);
    return;
  }

  console.log(`🎯 Encontrados ${pids.size} processo(s) na porta ${port}`);

  pids.forEach(pid => {
    console.log(`🔨 Matando processo PID: ${pid}`);
    exec(`taskkill /PID ${pid} /F`, (killError, killStdout, killStderr) => {
      if (killError) {
        console.log(`❌ Erro ao matar processo ${pid}: ${killError.message}`);
      } else {
        console.log(`✅ Processo ${pid} encerrado com sucesso`);
      }
    });
  });

  setTimeout(() => {
    console.log(`✨ Porta ${port} liberada!`);
  }, 1000);
});