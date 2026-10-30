const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Panggil konfigurasi database agar blok tes koneksi di atas otomatis berjalan
const db = require('./config/database');

const app = express();
app.use(cors());
app.use(express.json());

// Endpoint untuk cek status DB lewat browser atau Postman
app.get('/api/health', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT 1 + 1 AS test');
    res.json({
      success: true,
      message: 'Server dan Database MySQL terhubung lancar!',
      db_status: 'Connected',
      data: rows
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Database tidak dapat diakses',
      error: error.message
    });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(` Server aktif berjalan di http://localhost:${PORT}`);
});