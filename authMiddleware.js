// authMiddleware.js
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Fungsi untuk Menerbitkan Token (Issue)
const generateToken = (payload, expiresIn) => {
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
};

// Middleware untuk Memverifikasi Token (Verify)
const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'Akses ditolak. Token tidak ditemukan.' });

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) return res.status(403).json({ error: 'Token tidak valid atau kedaluwarsa.' });
        req.user = decoded;
        next();
    });
};

module.exports = { generateToken, verifyToken };