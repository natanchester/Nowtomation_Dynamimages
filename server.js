const express = require('express');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const sharp = require('sharp');
const bcrypt = require('bcrypt');
require('dotenv').config();
const app = express();
const PORT = 3000;
const USERS_FILE = "user.json";
const uploadDir = path.join(__dirname, 'uploads');
const processedDir = path.join(__dirname, 'processed_images');
const API_TOKEN = process.env.ADMIN_API_TOKEN;

[uploadDir, processedDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }
});

app.get('/', (req, res) => {
    res.status(404).send('Página não encontrada');
});

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage });

app.use(express.json());
app.use('/uploads', express.static(uploadDir));
app.use('/processed_images', express.static(processedDir));
app.use(express.static('public'));
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false, // Alterado para false para evitar sessões vazias
    cookie: { secure: false, httpOnly: true } // Se for HTTPS, altere secure para true
}));
app.use((req, res, next) => {
    if (req.path.endsWith('.html')) {
      if (!req.session || !req.session.user) {
        return res.redirect('/login.html');
      }
    }
    next();
  });


function loadUsers() {
    if (!fs.existsSync(USERS_FILE)) return [];

    try {
        const data = fs.readFileSync(USERS_FILE, 'utf8');
        return JSON.parse(data) || [];
    } catch (error) {
        console.error('Erro ao carregar usuários:', error);
        return []; // Retorna um array vazio em caso de erro
    }
}

function verificaAutenticacao(req, res, next) {
    if (req.session.user) {
        return next(); // Se estiver logado, continua para a rota
    }
    res.redirect('/login'); // Se não estiver logado, manda para o login
}

app.use((req, res, next) => {
    const openRoutes = ['/login', '/login-page']; // Apenas essas podem ser acessadas sem token
    const protectedPublicRoutes = ['/register', '/generate-image']; // Exigem token, mesmo sendo "públicas"

    // Se for uma rota de login, permite acesso sem token
    if (openRoutes.includes(req.path)) {
        return next();
    }

    // Obtém o token do header
    const token = req.headers.authorization?.split(' ')[1];

    // Se for uma API e o token de autorização estiver correto, permite acesso
    if (req.headers.accept?.includes('application/json') && token === API_TOKEN) {
        return next();
    }

    // Se for uma rota pública protegida, valida o token antes de permitir acesso
    if (protectedPublicRoutes.includes(req.path)) {
        if (token === API_TOKEN) {
            return next();
        }
        return res.status(401).json({ error: 'Token inválido para esta rota!' });
    }

    // Se o usuário estiver autenticado via sessão, permite acesso
    if (req.session.user) {
        return next();
    }

    // Se for uma API, retorna erro 401 (não autorizado)
    if (req.headers.accept?.includes('application/json')) {
        return res.status(401).json({ error: 'Acesso não autorizado!' });
    }

    // Se não for API, redireciona para a página de login
    return res.redirect('/login-page');
});



app.use('/Dynamimages', express.static('public'));



async function authenticateUser(email, password) {
    let users = loadUsers();
    const user = users.find(u => u.email === email);
    if (!user) return null;

    const passwordMatch = await bcrypt.compare(password, user.password);
    return passwordMatch ? user : null;
}



async function downloadImage(imageUrl) {
    try {
        const filename = `download-${Date.now()}.png`;
        const filepath = path.join(uploadDir, filename);
        
        const response = await axios({
            url: imageUrl,
            responseType: 'stream'
        });

        await new Promise((resolve, reject) => {
            const writer = fs.createWriteStream(filepath);
            response.data.pipe(writer);
            writer.on('finish', resolve);
            writer.on('error', reject);
        });

        console.log(`Overlay baixado com sucesso: ${filepath}`);
        return filepath;
    } catch (error) {
        console.error(`Erro ao baixar imagem ${imageUrl}:`, error);
        throw new Error('Falha ao baixar overlay');
    }
}

app.get('/verifica-sessao', (req, res) => {
    res.json({ logado: !!req.session.user });
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'E-mail e senha são obrigatórios!' });
    }

    const user = await authenticateUser(email, password);

    if (!user) {
        return res.status(401).json({ error: 'Credenciais inválidas!' });
    }

    req.session.user = { id: user.id, name: user.name, email: user.email }; // Armazena na sessão

    res.json({ message: 'Login bem-sucedido!', user: req.session.user });
});

app.get('/login-page', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login-page');
    });
});


app.post('/generate-image', async (req, res) => {
    try {
        const { baseImage, overlayImage, text, textColor, textSize, textPosX, textPosY, overlaySize, overlayPosX, overlayPosY, overlayRadius } = req.body;

        if (!baseImage || !overlayImage || !text) {
            return res.status(400).json({ error: 'Todos os campos são obrigatórios!' });
        }

        const basePath = path.join(uploadDir, path.basename(baseImage));
        if (!fs.existsSync(basePath)) {
            return res.status(400).json({ error: 'Imagem base não encontrada' });
        }

        const overlayPath = overlayImage.startsWith('http') ? await downloadImage(overlayImage) : path.join(uploadDir, path.basename(overlayImage));
        if (!fs.existsSync(overlayPath)) {
            return res.status(400).json({ error: 'Overlay não encontrada' });
        }

        const outputFilename = `processed_${Date.now()}.png`;
        const outputPath = path.join(processedDir, outputFilename);

        const baseMetadata = await sharp(basePath).metadata();
        const baseWidth = baseMetadata.width;
        const baseHeight = baseMetadata.height;

        const overlayMetadata = await sharp(overlayPath).metadata();
        let overlayWidth = parseInt(overlaySize);
        let overlayHeight = Math.round((overlayMetadata.height / overlayMetadata.width) * overlayWidth);

        if (overlayWidth > baseWidth) overlayWidth = baseWidth;
        if (overlayHeight > baseHeight) overlayHeight = baseHeight;

        const maskSvg = `
            <svg width="${overlayWidth}" height="${overlayHeight}">
                <rect x="0" y="0" width="${overlayWidth}" height="${overlayHeight}" rx="${overlayRadius}" ry="${overlayRadius}" fill="white"/>
            </svg>`;

        const maskBuffer = Buffer.from(maskSvg);

        const roundedOverlayBuffer = await sharp(overlayPath)
            .resize(overlayWidth, overlayHeight)
            .ensureAlpha()
            .composite([{ input: maskBuffer, blend: 'dest-in' }])
            .png()
            .toBuffer();

        const textPosYNum = parseInt(textPosY, 10) || 0;
        let textSizeNum = parseInt(textSize, 10) || 0;

        // Criar SVG temporário para medir a largura do texto
        let tempSvg = `
            <svg xmlns="http://www.w3.org/2000/svg">
                <text x="0" y="${textSizeNum}" font-size="${textSizeNum}" font-family="Arial" font-weight="bold">${text}</text>
            </svg>`;

        let tempBuffer = Buffer.from(tempSvg);
        let { width: textWidth } = await sharp(tempBuffer).metadata();

        // Se o texto for maior que 300px, reduz proporcionalmente
        if (textWidth > 300) {
            const scaleFactor = 300 / textWidth;
            textSizeNum = Math.floor(textSizeNum * scaleFactor);
            textWidth = 300; // Atualiza a largura após redução
        }

        // Recalcula a posição X para centralizar corretamente
        const adjustedTextPosX = (baseWidth - textWidth) / 2;

        // Gerar SVG final do texto já ajustado
        const finalSvgText = `
            <svg width="${baseWidth}" height="${baseHeight}" xmlns="http://www.w3.org/2000/svg">
                <text x="${adjustedTextPosX}" y="${textPosYNum + textSizeNum}" font-size="${textSizeNum}" fill="${textColor}" font-family="Arial" font-weight="bold">${text}</text>
            </svg>`;

        const textBuffer = Buffer.from(finalSvgText);

        await sharp(basePath)
            .ensureAlpha()
            .composite([
                { input: roundedOverlayBuffer, left: parseInt(overlayPosX), top: parseInt(overlayPosY) },
                { input: textBuffer, left: 0, top: 0 }
            ])
            .png()
            .toFile(outputPath);

        const processedImageUrl = `${req.protocol}://${req.get('host')}/processed_images/${outputFilename}`;
        res.json({ processedImageUrl });
    } catch (error) {
        console.error("Erro ao processar a imagem:", error);
        res.status(500).json({ error: "Erro ao processar a imagem." });
    }
});

app.post('/upload-base', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'Nenhuma imagem foi enviada!' });
    }
    const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    res.json({ imageUrl });
});

app.post("/resize-image", upload.single("image"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "Nenhuma imagem foi enviada!" });
        }

        const inputPath = req.file.path;
        const outputFilename = `resized_${Date.now()}.png`;
        const outputPath = path.join(processedDir, outputFilename);

        await sharp(inputPath)
            .resize(350)
            .toFormat("png", { quality: 90 })
            .toFile(outputPath);

        const resizedImageUrl = `${req.protocol}://${req.get("host")}/processed_images/${outputFilename}`;

        // Força o download seguro
        res.setHeader("Content-Disposition", `attachment; filename=${outputFilename}`);
        res.setHeader("Content-Type", "image/png");

        res.json({ resizedImageUrl });
    } catch (error) {
        res.status(500).json({ error: "Erro ao processar imagem" });
    }
});

app.delete('/clear-storage', (req, res) => {
    [uploadDir, processedDir].forEach(dir => {
        fs.readdir(dir, (err, files) => {
            if (err) {
                return res.status(500).json({ error: 'Erro ao acessar diretório' });
            }
            files.forEach(file => {
                fs.unlink(path.join(dir, file), err => {
                    if (err) console.error(`Erro ao excluir arquivo: ${file}`);
                });
            });
        });
    });
    res.json({ message: 'Pastas limpas com sucesso!' });
});

app.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const adminToken = req.headers.authorization;

        if (!adminToken || adminToken !== `Bearer ${process.env.ADMIN_REGISTER_TOKEN}`) {
            return res.status(403).json({ error: 'Acesso negado! Token inválido.' });
        }

        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Nome, e-mail e senha são obrigatórios!' });
        }

        let users = loadUsers();
        if (users.find(u => u.email === email)) {
            return res.status(400).json({ error: 'E-mail já registrado!' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = { id: Date.now(), name, email, password: hashedPassword };
        users.push(newUser);

        try {
            fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
        } catch (err) {
            return res.status(500).json({ error: 'Erro ao salvar usuário!' });
        }

        res.json({ message: 'Usuário registrado com sucesso!', user: { id: newUser.id, name, email } });
    } catch (error) {
        console.error("Erro ao registrar usuário:", error);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
