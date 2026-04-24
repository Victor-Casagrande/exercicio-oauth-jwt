const express = require('express');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL }));
app.use(express.json());

app.get('/api/auth/google', (req, res) => {
    const rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
    const options = new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI,
        response_type: 'code',
        scope: 'profile email',
        access_type: 'offline',
        prompt: 'consent'
    });

    res.redirect(`${rootUrl}?${options.toString()}`);
});

app.get('/api/auth/google/callback', async (req, res) => {
    const code = req.query.code;

    if (!code) {
        return res.redirect(`${process.env.FRONTEND_URL}?error=codigo_nao_fornecido`);
    }

    try {
        const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', new URLSearchParams({
            code: code,
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            redirect_uri: process.env.GOOGLE_REDIRECT_URI,
            grant_type: 'authorization_code'
        }).toString(), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        const accessToken = tokenResponse.data.access_token;

        const userResponse = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        const userData = userResponse.data;

        const DOMINIO_PERMITIDO = ['@ifc.edu.br', '@gmail.com'];
        if (!DOMINIO_PERMITIDO.some(domain => userData.email.endsWith(domain))) {
            return res.redirect(`${process.env.FRONTEND_URL}?error=dominio_invalido`);
        }

        const internalToken = jwt.sign(
            { 
                id: userData.id, 
                name: userData.name, 
                email: userData.email,
                domain: DOMINIO_PERMITIDO
            },
            process.env.JWT_SECRET,
            { expiresIn: '2h' }
        );

        res.redirect(`${process.env.FRONTEND_URL}?token=${internalToken}`);

    } catch (error) {
        console.error('Erro na autenticação:', error.response?.data || error.message);
        res.redirect(`${process.env.FRONTEND_URL}?error=falha_autenticacao`);
    }
});

function verifyToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Acesso negado. Token não fornecido.' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decodedUser) => {
        if (err) {
            return res.status(403).json({ error: 'Token inválido ou expirado.' });
        }
        
        req.user = decodedUser;
        next();
    });
}

app.get('/api/protected', verifyToken, (req, res) => {
    res.json({
        message: 'Acesso autorizado à área restrita do sistema!',
        secretData: [
            { matricula: '2024001', curso: 'Ciência da Computação' },
            { matricula: '2024002', curso: 'Engenharia de Controle e Automação' }
        ],
        currentUser: req.user
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Backend rodando em http://localhost:${PORT}`);
});