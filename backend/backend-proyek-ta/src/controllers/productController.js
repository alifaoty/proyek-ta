const db = require('../config/database');
const { logAudit } = require('../utils/auditLogger');

const CATEGORIES = ['ban', 'velg'];
const CONDITIONS = ['baru', 'bekas'];
const RING_SIZES = ['R13', 'R14', 'R15', 'R16', 'R17', 'R18', 'R19', 'R20'];

// Kolom yang dikembalikan ke API (tanpa minimum_stock) + field virtual is_available
const PRODUCT_COLUMNS = `id, code, name, category, item_condition, ring_size, specification,
  purchase_price, selling_price, current_stock, (current_stock > 0) AS is_available,
  created_at, updated_at`;

// Ubah baris DB menjadi format API (angka desimal & boolean)
const formatProduct = (row) => ({
  ...row,
  purchase_price: Number(row.purchase_price),
  selling_price: Number(row.selling_price),
  is_available: Boolean(row.is_available),
});

const fail = (res, status, message) => res.status(status).json({ success: false, message });
const serverError = (res, error, label) => {
  console.error(`Kesalahan ${label}:`, error);
  return fail(res, 500, 'Terjadi kesalahan internal server');
};

const isValidId = (id) => /^\d+$/.test(String(id));

/**
 * Validasi & normalisasi payload produk.
 * Mengembalikan { error } atau { data }.
 */
const validatePayload = (body) => {
  const code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : '';
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const ringSize = typeof body.ring_size === 'string' ? body.ring_size.trim().toUpperCase() : '';
  const specification =
    typeof body.specification === 'string' && body.specification.trim() !== ''
      ? body.specification.trim()
      : null;

  if (!code || code.length > 50) return { error: 'Kode produk wajib diisi (maksimal 50 karakter)' };
  if (!name || name.length > 150) return { error: 'Nama produk wajib diisi (maksimal 150 karakter)' };
  if (!CATEGORIES.includes(body.category)) return { error: "Kategori harus 'ban' atau 'velg'" };
  if (!CONDITIONS.includes(body.item_condition)) return { error: "Kondisi harus 'baru' atau 'bekas'" };
  if (!RING_SIZES.includes(ringSize)) return { error: 'Ukuran ring wajib diisi (R13 sampai R20)' };
  if (specification && specification.length > 100) return { error: 'Spesifikasi maksimal 100 karakter' };

  const isNum = (v) => v !== '' && v !== null && v !== undefined && Number.isFinite(Number(v));

  if (!isNum(body.purchase_price) || Number(body.purchase_price) < 0)
    return { error: 'Harga beli wajib berupa angka tidak negatif' };
  if (!isNum(body.selling_price) || Number(body.selling_price) < 0)
    return { error: 'Harga jual wajib berupa angka tidak negatif' };
  if (Number(body.selling_price) < Number(body.purchase_price))
    return { error: 'Harga jual tidak boleh lebih rendah dari harga beli' };

  const stockRaw = body.current_stock === undefined ? 0 : body.current_stock;
  if (!isNum(stockRaw) || Number(stockRaw) < 0 || !Number.isInteger(Number(stockRaw)))
    return { error: 'Stok harus berupa bilangan bulat tidak negatif' };

  return {
    data: {
      code,
      name,
      category: body.category,
      item_condition: body.item_condition,
      ring_size: ringSize,
      specification,
      purchase_price: Number(body.purchase_price),
      selling_price: Number(body.selling_price),
      current_stock: Number(stockRaw),
    },
  };
};

// GET /api/products
const getProducts = async (req, res) => {
  try {
    const { search, category, ring_size, stock_status } = req.query;
    // Mendukung 'condition' maupun 'item_condition'
    const condition = req.query.condition || req.query.item_condition;

    const where = [];
    const params = [];

    if (search && String(search).trim()) {
      where.push('(code LIKE ? OR name LIKE ?)');
      const kw = `%${String(search).trim()}%`;
      params.push(kw, kw);
    }
    if (category) {
      if (!CATEGORIES.includes(category)) return fail(res, 400, "Filter category harus 'ban' atau 'velg'");
      where.push('category = ?');
      params.push(category);
    }
    if (condition) {
      if (!CONDITIONS.includes(condition)) return fail(res, 400, "Filter condition harus 'baru' atau 'bekas'");
      where.push('item_condition = ?');
      params.push(condition);
    }
    if (ring_size) {
      where.push('ring_size = ?');
      params.push(String(ring_size).toUpperCase());
    }
    if (stock_status) {
      if (stock_status === 'available') where.push('current_stock > 0');
      else if (stock_status === 'empty') where.push('current_stock = 0');
      else return fail(res, 400, "Filter stock_status harus 'available' atau 'empty'");
    }

    const sql = `SELECT ${PRODUCT_COLUMNS} FROM products
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY id DESC`;
    const [rows] = await db.execute(sql, params);

    return res.status(200).json({
      success: true,
      message: 'Data produk berhasil diambil',
      data: rows.map(formatProduct),
    });
  } catch (error) {
    return serverError(res, error, 'getProducts');
  }
};

// GET /api/products/:id
const getProductById = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return fail(res, 404, 'Produk tidak ditemukan');

    const [rows] = await db.execute(`SELECT ${PRODUCT_COLUMNS} FROM products WHERE id = ? LIMIT 1`, [
      req.params.id,
    ]);
    if (rows.length === 0) return fail(res, 404, 'Produk tidak ditemukan');

    return res.status(200).json({
      success: true,
      message: 'Detail produk ditemukan',
      data: formatProduct(rows[0]),
    });
  } catch (error) {
    return serverError(res, error, 'getProductById');
  }
};

// POST /api/products
const createProduct = async (req, res) => {
  try {
    const { error, data } = validatePayload(req.body || {});
    if (error) return fail(res, 400, error);

    const [dup] = await db.execute('SELECT id FROM products WHERE code = ? LIMIT 1', [data.code]);
    if (dup.length > 0) return fail(res, 409, 'Kode produk sudah terdaftar');

    const [result] = await db.execute(
      `INSERT INTO products (code, name, category, item_condition, ring_size, specification,
        purchase_price, selling_price, current_stock) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.code, data.name, data.category, data.item_condition, data.ring_size,
        data.specification, data.purchase_price, data.selling_price, data.current_stock,
      ]
    );

    await logAudit({
      userId: req.user.id,
      action: 'CREATE_PRODUCT',
      endpoint: 'POST /api/products',
      description: `Menambahkan produk baru: ${data.code} - ${data.name}`,
    });

    const [rows] = await db.execute(`SELECT ${PRODUCT_COLUMNS} FROM products WHERE id = ?`, [
      result.insertId,
    ]);

    return res.status(201).json({
      success: true,
      message: 'Produk berhasil ditambahkan',
      data: formatProduct(rows[0]),
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return fail(res, 409, 'Kode produk sudah terdaftar');
    return serverError(res, error, 'createProduct');
  }
};

// PUT /api/products/:id
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return fail(res, 404, 'Produk tidak ditemukan');

    const [existing] = await db.execute('SELECT * FROM products WHERE id = ? LIMIT 1', [id]);
    if (existing.length === 0) return fail(res, 404, 'Produk tidak ditemukan');

    // Field yang tidak dikirim memakai nilai lama, lalu seluruh payload divalidasi
    const merged = { ...existing[0], ...(req.body || {}) };
    const { error, data } = validatePayload(merged);
    if (error) return fail(res, 400, error);

    const [dup] = await db.execute('SELECT id FROM products WHERE code = ? AND id != ? LIMIT 1', [
      data.code,
      id,
    ]);
    if (dup.length > 0) return fail(res, 409, 'Kode produk sudah terdaftar');

    await db.execute(
      `UPDATE products SET code = ?, name = ?, category = ?, item_condition = ?, ring_size = ?,
        specification = ?, purchase_price = ?, selling_price = ?, current_stock = ? WHERE id = ?`,
      [
        data.code, data.name, data.category, data.item_condition, data.ring_size,
        data.specification, data.purchase_price, data.selling_price, data.current_stock, id,
      ]
    );

    await logAudit({
      userId: req.user.id,
      action: 'UPDATE_PRODUCT',
      endpoint: `PUT /api/products/${id}`,
      description: `Memperbarui produk: ${data.code} - ${data.name}`,
    });

    const [rows] = await db.execute(`SELECT ${PRODUCT_COLUMNS} FROM products WHERE id = ?`, [id]);

    return res.status(200).json({
      success: true,
      message: 'Data produk berhasil diperbarui',
      data: formatProduct(rows[0]),
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return fail(res, 409, 'Kode produk sudah terdaftar');
    return serverError(res, error, 'updateProduct');
  }
};

// DELETE /api/products/:id
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return fail(res, 404, 'Produk tidak ditemukan');

    const [existing] = await db.execute('SELECT id, code, name FROM products WHERE id = ? LIMIT 1', [id]);
    if (existing.length === 0) return fail(res, 404, 'Produk tidak ditemukan');

    // Integrity guard: tolak jika sudah ada riwayat mutasi atau transaksi
    const [mutations] = await db.execute('SELECT 1 FROM stock_mutation_logs WHERE product_id = ? LIMIT 1', [id]);
    const [items] = await db.execute('SELECT 1 FROM transaction_items WHERE product_id = ? LIMIT 1', [id]);
    if (mutations.length > 0 || items.length > 0) {
      return fail(res, 400, 'Produk memiliki riwayat mutasi/transaksi dan tidak boleh dihapus');
    }

    await db.execute('DELETE FROM products WHERE id = ?', [id]);

    await logAudit({
      userId: req.user.id,
      action: 'DELETE_PRODUCT',
      endpoint: `DELETE /api/products/${id}`,
      description: `Menghapus produk: ${existing[0].code} - ${existing[0].name}`,
    });

    return res.status(200).json({ success: true, message: 'Produk berhasil dihapus dari sistem' });
  } catch (error) {
    // Foreign key RESTRICT (mis. stock_opname_details) juga dianggap berelasi
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return fail(res, 400, 'Produk memiliki riwayat mutasi/transaksi dan tidak boleh dihapus');
    }
    return serverError(res, error, 'deleteProduct');
  }
};

module.exports = { getProducts, getProductById, createProduct, updateProduct, deleteProduct };

