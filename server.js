const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const sharp = require('sharp');
require('dotenv').config();

const app = express();
const PORT = 3000;

app.use(express.json());

const uploadDir = path.join(__dirname, 'uploads');
const processedDir = path.join(__dirname, 'processed_images');

[uploadDir, processedDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }
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

app.use('/uploads', express.static(uploadDir));
app.use('/processed_images', express.static(processedDir));
app.use(express.static('public'));

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

app.get('/Dynamimage', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


app.post('/resize-image', upload.single('image'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'Nenhuma imagem foi enviada!' });
    }

    const inputPath = req.file.path;
    const outputFilename = `resized_${Date.now()}.png`;
    const outputPath = path.join(processedDir, outputFilename);

    await sharp(inputPath)
        .resize(350)
        .toFormat('png', { quality: 90 })
        .toFile(outputPath);

    const resizedImageUrl = `${req.protocol}://${req.get('host')}/processed_images/${outputFilename}`;
    res.json({ resizedImageUrl });
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

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
