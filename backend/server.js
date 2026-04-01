const express = require('express');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const sharp = require('sharp');
const bcrypt = require('bcrypt');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const USERS_FILE = path.join(__dirname, 'user.json');
const uploadDir = path.join(__dirname, 'uploads');
const processedDir = path.join(__dirname, 'processed_images');
const API_TOKEN = process.env.ADMIN_API_TOKEN;

// Cria pastas se não existirem
[uploadDir, processedDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// ===================== CORS =====================
// Coloque aqui a URL do seu frontend no Cloudflare Pages
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:8080';

app.use(cors({
    origin: FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ===================== MULTER =====================
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

// ===================== MIDDLEWARES =====================
app.use(express.json());
app.use('/uploads', express.static(uploadDir));
app.use('/processed_images', express.static(processedDir));

app.use(session({
    secret: process.env.SESSION_SECRET || 'segredo-padrao-troque-isso',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 24 * 60 * 60 * 1000
    }
}));

// ===================== HELPERS =====================
function loadUsers() {
    if (!fs.existsSync(USERS_FILE)) return [];
    try {
        const data = fs.readFileSync(USERS_FILE, 'utf8');
        return JSON.parse(data) || [];
    } catch (error) {
        console.error('Erro ao carregar usuários:', error);
        return [];
    }
}

function saveUsers(users) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

async function authenticateUser(email, password) {
    const users = loadUsers();
    const user = users.find(u => u.email === email);
    if (!user) return null;
    const passwordMatch = await bcrypt.compare(password, user.password);
    return passwordMatch ? user : null;
}

function escapeXml(str) {
    return str.replace(/[<>&'"]/g, function (match) {
        switch (match) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case "'": return '&apos;';
            case '"': return '&quot;';
        }
    });
}

async function downloadImage(imageUrl) {
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
}

// ===================== MIDDLEWARE DE AUTH =====================
app.use((req, res, next) => {
    const openRoutes = ['/login', '/verifica-sessao'];
    const protectedPublicRoutes = ['/register', '/generate-image'];

    if (openRoutes.includes(req.path)) return next();

    const token = req.headers.authorization?.split(' ')[1];

    if (req.headers.accept?.includes('application/json') && token === API_TOKEN) {
        return next();
    }

    if (protectedPublicRoutes.includes(req.path)) {
        if (token === API_TOKEN) return next();
        return res.status(401).json({ error: 'Token inválido para esta rota!' });
    }

    if (req.session.user) return next();

    if (req.headers.accept?.includes('application/json')) {
        return res.status(401).json({ error: 'Acesso não autorizado!' });
    }

    return res.status(401).json({ error: 'Acesso não autorizado!' });
});

// ===================== ROTAS =====================

// Verificar sessão
app.get('/verifica-sessao', (req, res) => {
    res.json({ logado: !!req.session.user });
});

// Login
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'E-mail e senha são obrigatórios!' });
    }

    const user = await authenticateUser(email, password);
    if (!user) {
        return res.status(401).json({ error: 'Credenciais inválidas!' });
    }

    req.session.user = { id: user.id, name: user.name, email: user.email };
    res.json({ message: 'Login bem-sucedido!', user: req.session.user });
});

// Logout
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.json({ message: 'Logout realizado.' });
    });
});

// Upload imagem base
app.post('/upload-base', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'Nenhuma imagem foi enviada!' });
    }
    const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    res.json({ imageUrl });
});

// Gerar imagem processada
app.post('/generate-image', async (req, res) => {
    try {
        const {
            baseImage, overlayImage, text, textColor, textSize,
            textPosX, textPosY, overlaySize, overlayPosX, overlayPosY,
            overlayRadius, textAlign = 'center', fontWeight = 'bold',
            fontFamily = 'Arial'
        } = req.body;

        if (!baseImage || !overlaySize || !overlayPosX || !overlayPosY || !overlayRadius) {
            return res.status(400).json({ error: 'Campos obrigatórios ausentes.' });
        }

        const basePath = path.join(uploadDir, path.basename(baseImage));
        if (!fs.existsSync(basePath)) {
            return res.status(400).json({ error: 'Imagem base não encontrada' });
        }

        const baseMetadata = await sharp(basePath).metadata();
        const baseWidth = baseMetadata.width;
        const baseHeight = baseMetadata.height;
        const scaleFactor = baseWidth / 350;

        let overlayBuffer = null;
        if (overlayImage) {
            const overlayPath = overlayImage.startsWith('http')
                ? await downloadImage(overlayImage)
                : path.join(uploadDir, path.basename(overlayImage));

            if (!fs.existsSync(overlayPath)) {
                return res.status(400).json({ error: 'Overlay não encontrada' });
            }

            const overlayMetadata = await sharp(overlayPath).metadata();
            let overlayWidth = Math.round(parseInt(overlaySize) * scaleFactor);
            let overlayHeight = Math.round((overlayMetadata.height / overlayMetadata.width) * overlayWidth);

            if (overlayWidth > baseWidth) overlayWidth = baseWidth;
            if (overlayHeight > baseHeight) overlayHeight = baseHeight;

            const maskSvg = `
                <svg xmlns="http://www.w3.org/2000/svg" width="${overlayWidth}" height="${overlayHeight}">
                    <rect x="0" y="0" width="${overlayWidth}" height="${overlayHeight}" rx="${overlayRadius * scaleFactor}" ry="${overlayRadius * scaleFactor}" fill="white"/>
                </svg>`;

            overlayBuffer = await sharp(overlayPath)
                .resize(overlayWidth, overlayHeight)
                .ensureAlpha()
                .composite([{ input: Buffer.from(maskSvg), blend: 'dest-in' }])
                .png()
                .toBuffer();
        }

        let textBuffer = null;
        if (text) {
            const escapedText = escapeXml(text);
            const textSizeNum = parseInt(textSize) * scaleFactor;
            const textPosYNum = parseInt(textPosY) * scaleFactor;

            const tempSvg = `
                <svg xmlns="http://www.w3.org/2000/svg">
                    <text x="0" y="${textSizeNum}" font-size="${textSizeNum}" font-family="${fontFamily}" font-weight="${fontWeight}">${escapedText}</text>
                </svg>`;
            const { width: textWidth } = await sharp(Buffer.from(tempSvg)).metadata();

            let adjustedTextPosX = 0;
            if (textAlign === 'center') {
                adjustedTextPosX = (baseWidth - textWidth) / 2;
            } else if (textAlign === 'right') {
                adjustedTextPosX = baseWidth - textWidth - 10;
            } else {
                adjustedTextPosX = parseInt(textPosX) * scaleFactor;
            }

            const finalSvgText = `
                <svg width="${baseWidth}" height="${baseHeight}" xmlns="http://www.w3.org/2000/svg">
                    <text x="${adjustedTextPosX}" y="${textPosYNum + textSizeNum}" font-size="${textSizeNum}" fill="${textColor}" font-family="${fontFamily}" font-weight="${fontWeight}">${escapedText}</text>
                </svg>`;
            textBuffer = Buffer.from(finalSvgText);
        }

        const outputFilename = `processed_${Date.now()}.png`;
        const outputPath = path.join(processedDir, outputFilename);

        const compositeArray = [];
        if (textBuffer) compositeArray.push({ input: textBuffer, left: 0, top: 0 });
        if (overlayBuffer) {
            compositeArray.push({
                input: overlayBuffer,
                left: Math.round(parseInt(overlayPosX) * scaleFactor),
                top: Math.round(parseInt(overlayPosY) * scaleFactor)
            });
        }

        await sharp(basePath)
            .ensureAlpha()
            .composite(compositeArray)
            .png()
            .toFile(outputPath);

        const processedImageUrl = `${req.protocol}://${req.get('host')}/processed_images/${outputFilename}`;
        res.json({ processedImageUrl });

    } catch (error) {
        console.error("Erro ao processar a imagem:", error);
        res.status(500).json({ error: "Erro ao processar a imagem." });
    }
});

// Redimensionar imagem
app.post('/resize-image', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Nenhuma imagem foi enviada!' });
        }

        const outputFilename = `resized_${Date.now()}.png`;
        const outputPath = path.join(processedDir, outputFilename);

        await sharp(req.file.path)
            .resize(350)
            .toFormat('png', { quality: 90 })
            .toFile(outputPath);

        const resizedImageUrl = `${req.protocol}://${req.get('host')}/processed_images/${outputFilename}`;
        res.json({ resizedImageUrl });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao processar imagem' });
    }
});

// Limpar armazenamento
app.delete('/clear-storage', (req, res) => {
    [uploadDir, processedDir].forEach(dir => {
        fs.readdir(dir, (err, files) => {
            if (err) return;
            files.forEach(file => {
                fs.unlink(path.join(dir, file), err => {
                    if (err) console.error(`Erro ao excluir arquivo: ${file}`);
                });
            });
        });
    });
    res.json({ message: 'Pastas limpas com sucesso!' });
});

// Registrar usuário
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
        saveUsers(users);

        res.json({ message: 'Usuário registrado com sucesso!', user: { id: newUser.id, name, email } });
    } catch (error) {
        console.error("Erro ao registrar usuário:", error);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

// ===================== START =====================
app.listen(PORT, () => {
    console.log(`✅ Servidor rodando em http://localhost:${PORT}`);
    console.log(`📁 Uploads: ${uploadDir}`);
    console.log(`📁 Processadas: ${processedDir}`);
    console.log(`🌐 Frontend permitido: ${FRONTEND_URL}`);
});
