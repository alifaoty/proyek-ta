require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Panggil konfigurasi database agar blok tes koneksi di atas otomatis berjalan
const db = require('./config/database');

const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const transactionRoutes = require('./routes/transactionRoutes');

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

// Registrasi rute modul autentikasi
app.use('/api/auth', authRoutes);

// Registrasi rute modul master produk
app.use('/api/products', productRoutes);

// Registrasi rute modul mutasi persediaan
app.use('/api/inventory', inventoryRoutes);

// Registrasi rute modul kasir POS & transaksi penjualan
app.use('/api/transactions', transactionRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(` Server aktif berjalan di http://localhost:${PORT}`);
});