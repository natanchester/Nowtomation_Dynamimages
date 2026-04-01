const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
const prompt = require('prompt-sync')({ sigint: true });

const USERS_FILE = path.join(__dirname, 'user.json');

// Validações
function isValidEmail(email) {
  return /\S+@\S+\.\S+/.test(email);
}

function loadUsers() {
  if (!fs.existsSync(USERS_FILE)) return [];
  return JSON.parse(fs.readFileSync(USERS_FILE));
}

function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

async function createAdmin() {
  console.clear();
  console.log('==============================');
  console.log('   CRIAR USUÁRIO ADMIN');
  console.log('==============================\n');

  const users = loadUsers();

  // Nome
  let name;
  do {
    name = prompt('Nome: ').trim();
    if (!name) console.log('❌ Nome é obrigatório.');
  } while (!name);

  // Email
  let email;
  do {
    email = prompt('Email: ').trim();

    if (!isValidEmail(email)) {
      console.log('❌ Email inválido.');
      email = null;
      continue;
    }

    const exists = users.find(u => u.email === email);
    if (exists) {
      console.log('❌ Email já cadastrado.');
      email = null;
    }

  } while (!email);

  // Senha
  let password;
  let confirm;

  do {
    password = prompt.hide('Senha: ');
    confirm = prompt.hide('Confirmar senha: ');

    if (password.length < 6) {
      console.log('❌ A senha deve ter pelo menos 6 caracteres.');
      continue;
    }

    if (password !== confirm) {
      console.log('❌ As senhas não coincidem.');
      password = null;
    }

  } while (!password);

  const hashedPassword = await bcrypt.hash(password, 10);

  const newUser = {
    id: users.length ? Math.max(...users.map(u => u.id)) + 1 : 1,
    name,
    email,
    password: hashedPassword,
    role: 'admin',
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  saveUsers(users);

  console.log('\n✅ Usuário admin criado com sucesso!');
  console.log(`📧 Email: ${email}`);
}

createAdmin().catch(console.error);