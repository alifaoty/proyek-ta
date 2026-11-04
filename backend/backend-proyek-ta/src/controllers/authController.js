const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { logAudit } = require('../utils/auditLogger');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_toko_ban_velg_key_2026';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (
      !email || !password ||
      typeof email !== 'string' || typeof password !== 'string' ||
      !EMAIL_REGEX.test(email.trim()) || email.trim().length > 100 ||
      password.length < 6
    ) {
      return res.status(400).json({ success: false, message: 'Email dan password wajib diisi' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const [rows] = await db.execute(
      'SELECT id, name, email, password, role FROM users WHERE email = ? LIMIT 1',
      [normalizedEmail]
    );

    const user = rows[0];
    const isValid = user ? await bcrypt.compare(password, user.password) : false;

    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Email atau kata sandi tidak valid' });
    }

    await logAudit({
      userId: user.id,
      action: 'LOGIN',
      endpoint: 'POST /api/auth/login',
      description: `Pengguna ${user.name} (${user.role}) berhasil masuk sistem`
    });

    const token = jwt.sign(
      { id: user.id, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.status(200).json({
      success: true,
      message: 'Autentikasi berhasil',
      data: {
        token,
        user: { id: user.id, name: user.name, email: user.email, role: user.role }
      }
    });
  } catch (error) {
    console.error('Kesalahan login:', error);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan internal server' });
  }
};

// GET /api/auth/me
const getMe = async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT id, name, email, role FROM users WHERE id = ? LIMIT 1',
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan' });
    }

    return res.status(200).json({
      success: true,
      message: 'Data profil sesi terverifikasi',
      data: rows[0]
    });
  } catch (error) {
    console.error('Kesalahan getMe:', error);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan internal server' });
  }
};

module.exports = { login, getMe };