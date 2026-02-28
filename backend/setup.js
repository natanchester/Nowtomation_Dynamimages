// Script para criar o primeiro usuário admin
// Execute: node setup.js

const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');

const USERS_FILE = path.join(__dirname, 'user.json');

async function createAdmin() {
    const admin = {
        id: 1,
        name: 'Adminn',
        email: 'admin@gmail.com',
        password: await bcrypt.hash('123456', 10)
    };

    fs.writeFileSync(USERS_FILE, JSON.stringify([admin], null, 2));
    console.log('✅ Usuário criado com sucesso!');
}

createAdmin().catch(console.error);
