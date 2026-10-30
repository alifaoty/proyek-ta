const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'db_proyek_ta',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Tes koneksi database langsung saat file ini dipanggil
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log(' Berhasil terhubung ke database MySQL: ' + (process.env.DB_NAME || 'db_proyek_ta'));
    connection.release(); // Kembalikan koneksi ke pool
  } catch (error) {
    console.error(' Gagal terhubung ke database MySQL:');
    console.error(`- Pesan: ${error.message}`);
    console.error(`- Kode: ${error.code}`);
  }
})();

module.exports = pool;