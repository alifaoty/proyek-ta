const db = require('./database');

/**
 * Memastikan tabel operational_expenses dan nilai ENUM 'penyesuaian' pada stock_mutation_logs
 * tersedia di database sebelum server mulai menerima request.
 */
async function initializeSchemas() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS operational_expenses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        expense_code VARCHAR(50) NOT NULL UNIQUE,
        category ENUM(
          'listrik_air_internet',
          'gaji_karyawan',
          'sewa_tempat',
          'perlengkapan_bengkel',
          'konsumsi_toko',
          'perawatan_alat',
          'lain_lain'
        ) NOT NULL,
        amount DECIMAL(12, 2) NOT NULL,
        expense_date DATE NOT NULL,
        notes TEXT NULL,
        created_by INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_expense_user FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE RESTRICT
      ) ENGINE=InnoDB;
    `);
  } catch (err) {
    console.warn('Info pemeriksaan tabel operational_expenses:', err.message);
  }

  try {
    const [cols] = await db.query("SHOW COLUMNS FROM stock_mutation_logs LIKE 'mutation_type'");
    if (cols.length > 0) {
      const colType = String(cols[0].Type || cols[0].type || '');
      if (colType.toLowerCase().startsWith('enum(') && !colType.includes("'penyesuaian'")) {
        await db.query(
          "ALTER TABLE stock_mutation_logs MODIFY COLUMN mutation_type ENUM('masuk', 'keluar', 'penjualan', 'keluar_non_penjualan', 'adjustment_opname', 'penyesuaian') NOT NULL"
        );
      }
    }
  } catch (err) {
    console.warn('Info pemeriksaan skema stock_mutation_logs:', err.message);
  }
}

module.exports = { initializeSchemas };
