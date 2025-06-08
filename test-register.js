// Teste direto no Render - criar usuário
const testUrl = 'https://mailtrendz-backend.onrender.com/api/v1/auth/register';

const userData = {
  name: 'Gabriel Paulo',
  email: 'gabrielpaulo404@gmail.com',
  password: '123456789'
};

fetch(testUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(userData)
})
.then(res => res.json())
.then(data => {
  console.log('✅ Registro resultado:', data);
})
.catch(err => {
  console.error('❌ Erro no registro:', err);
});