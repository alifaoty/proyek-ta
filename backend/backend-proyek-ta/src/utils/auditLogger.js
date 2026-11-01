const db = require('../config/database');

/**
 * Mencatat satu entri jejak aktivitas ke tabel audit_trails.
 * Kegagalan pencatatan hanya dilog ke konsol agar tidak menggagalkan alur utama.
 *
 * @param {Object} params
 * @param {number|null} params.userId - ID pengguna pelaku aksi
 * @param {string} params.action - Nama aksi (contoh: 'LOGIN')
 * @param {string} params.endpoint - Endpoint yang diakses (contoh: 'POST /api/auth/login')
 * @param {string} params.description - Deskripsi aktivitas
 * @param {Object} [connection] - Koneksi opsional (untuk dipakai dalam transaksi)
 */
const logAudit = async ({ userId = null, action, endpoint = null, description = null }, connection = db) => {
  try {
    await connection.execute(
      'INSERT INTO audit_trails (user_id, action, endpoint, description) VALUES (?, ?, ?, ?)',
      [userId, action, endpoint, description]
    );
  } catch (error) {
    console.error('Gagal mencatat audit trail:', error.message);
  }
};

module.exports = { logAudit };

