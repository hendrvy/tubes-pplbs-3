// server.js
const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('./db');
const { generateToken, verifyToken } = require('./authMiddleware');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 3002;

// --- UTILITY: Simpan Token ke DB ---
async function saveTokenToDB(token, type, clientId, userId, expiresIn) {
    // Hitung waktu kedaluwarsa berdasarkan expiresIn (misal '15m' atau '7d')
    const expiresAt = new Date();
    if (expiresIn.includes('m')) expiresAt.setMinutes(expiresAt.getMinutes() + parseInt(expiresIn));
    if (expiresIn.includes('d')) expiresAt.setDate(expiresAt.getDate() + parseInt(expiresIn));

    await db.query(
        `INSERT INTO oauth_tokens (token, type, client_id, user_id, expires_at) VALUES (?, ?, ?, ?, ?)`,
        [token, type, clientId, userId || null, expiresAt]
    );
}

// ENDPOINT 1: /oauth/token
// Mendukung: password, client_credentials, refresh_token
app.post('/oauth/token', async (req, res) => {
    const { grant_type, client_id, client_secret, username, password, refresh_token } = req.body;

    // 1. Validasi Client
    const [clients] = await db.query('SELECT * FROM oauth_clients WHERE client_id = ? AND client_secret = ?', [client_id, client_secret]);
    if (clients.length === 0) return res.status(401).json({ error: 'invalid_client' });
    const client = clients[0];

    if (!client.grant_types.includes(grant_type)) {
        return res.status(400).json({ error: 'unsupported_grant_type' });
    }

    try {
        // --- GRANT TYPE: PASSWORD ---
        if (grant_type === 'password') {
            const [users] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
            if (users.length === 0) return res.status(401).json({ error: 'invalid_grant' });
            
            const user = users[0];
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) return res.status(401).json({ error: 'invalid_grant' });

            const payload = { userId: user.id, username: user.username, role: 'citizen' };
            const accessToken = generateToken(payload, process.env.JWT_ACCESS_EXPIRATION);
            const refreshToken = generateToken({ userId: user.id }, process.env.JWT_REFRESH_EXPIRATION);

            await saveTokenToDB(accessToken, 'access', client_id, user.id, process.env.JWT_ACCESS_EXPIRATION);
            await saveTokenToDB(refreshToken, 'refresh', client_id, user.id, process.env.JWT_REFRESH_EXPIRATION);

            return res.json({ access_token: accessToken, refresh_token: refreshToken, token_type: 'Bearer', expires_in: 3600 });
        }

        // --- GRANT TYPE: CLIENT CREDENTIALS ---
        else if (grant_type === 'client_credentials') {
            const payload = { clientId: client_id, role: 'service' };
            const accessToken = generateToken(payload, process.env.JWT_ACCESS_EXPIRATION);
            
            await saveTokenToDB(accessToken, 'access', client_id, null, process.env.JWT_ACCESS_EXPIRATION);

            return res.json({ access_token: accessToken, token_type: 'Bearer', expires_in: 3600 });
        }

        // --- GRANT TYPE: REFRESH TOKEN ---
        else if (grant_type === 'refresh_token') {
            const [tokens] = await db.query('SELECT * FROM oauth_tokens WHERE token = ? AND type = "refresh" AND revoked = 0', [refresh_token]);
            if (tokens.length === 0) return res.status(401).json({ error: 'invalid_grant' });

            const dbToken = tokens[0];
            if (new Date() > new Date(dbToken.expires_at)) return res.status(401).json({ error: 'invalid_grant', desc: 'Token expired' });

            // Verifikasi JWT Refresh Token
            const decoded = jwt.verify(refresh_token, process.env.JWT_SECRET);
            
            // Buat Access Token Baru
            const payload = { userId: decoded.userId, role: 'citizen' };
            const newAccessToken = generateToken(payload, process.env.JWT_ACCESS_EXPIRATION);
            
            await saveTokenToDB(newAccessToken, 'access', client_id, decoded.userId, process.env.JWT_ACCESS_EXPIRATION);

            return res.json({ access_token: newAccessToken, token_type: 'Bearer', expires_in: 3600 });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'server_error' });
    }
});

// ENDPOINT 2: /oauth/introspect
app.post('/oauth/introspect', async (req, res) => {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'missing_token' });

    try {
        // Cek status di basis data (apakah sudah direvoke?)
        const [tokens] = await db.query('SELECT revoked FROM oauth_tokens WHERE token = ?', [token]);
        if (tokens.length === 0 || tokens[0].revoked === 1) {
            return res.json({ active: false });
        }

        // Verifikasi JWT
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        return res.json({ active: true, ...decoded });
    } catch (error) {
        return res.json({ active: false });
    }
});

// ENDPOINT 3: /oauth/revoke
app.post('/oauth/revoke', async (req, res) => {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'missing_token' });

    try {
        await db.query('UPDATE oauth_tokens SET revoked = 1 WHERE token = ?', [token]);
        return res.status(200).json({ message: 'Token successfully revoked' });
    } catch (error) {
        return res.status(500).json({ error: 'server_error' });
    }
});

// --- Test Proteksi Endpoint ---
app.get('/api/protected-test', verifyToken, (req, res) => {
    res.json({ message: 'Anda berhasil masuk!', user: req.user });
});

app.get("/health", (req, res) => {
    res.status(200).json({
        status: "healthy",
        service: "oauth-server",
        timestamp: new Date().toISOString()
    });
});

app.listen(PORT, () => {
    console.log(`Auth Service berjalan di http://localhost:${PORT}`);
});