import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';
import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';

import routes from './routes/index.js';

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(express.json());
app.use(cookieParser());
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
}));

app.use('/api', routes);

if (process.env.SWAGGER_ATIVO === 'true') {
    const { default: swaggerUi } = await import('swagger-ui-express');
    const { parse } = await import('yaml');
    const documento = parse(readFileSync(path.join(__dirname, 'docs/openapi.yaml'), 'utf8'));

    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(documento, {
        customSiteTitle: 'SGM — Documentação da API',
        swaggerOptions: {
            withCredentials: true,
            persistAuthorization: false,
            validatorUrl: null,
        },
    }));
}

// Impede que a rota da SPA devolva HTML quando a documentação está desativada.
app.use('/api-docs', (req, res) => {
    res.status(404).json({ msg: 'Documentação da API indisponível.' });
});

app.use(express.static(path.join(__dirname, '../client/dist')));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
