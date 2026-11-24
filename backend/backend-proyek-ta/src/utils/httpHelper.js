// Kesalahan yang sengaja dilempar untuk membatalkan transaksi dengan status HTTP tertentu
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Helper standar untuk mengirim respons JSON error
const fail = (res, status, message) => res.status(status).json({ success: false, message });

// Ambil ID pengguna dari payload token JWT pada req.user
const getActorId = (req) => req?.user?.id || req?.user?.userId || null;

/**
 * Penanganan error terpusat untuk controller.
 * Mendukung opsi pesan kustom untuk kode error MySQL seperti ER_DUP_ENTRY / ER_NO_REFERENCED_ROW_2.
 */
const handleControllerError = (res, error, context = 'controller', options = {}) => {
  if (error instanceof HttpError) {
    return fail(res, error.status, error.message);
  }
  if (error?.code === 'ER_DUP_ENTRY' && options.dupMessage) {
    return fail(res, 409, options.dupMessage);
  }
  if (error?.code === 'ER_NO_REFERENCED_ROW_2' && options.refMessage) {
    return fail(res, 400, options.refMessage);
  }
  if (error?.code === 'ER_ROW_IS_REFERENCED_2' && options.referencedMessage) {
    return fail(res, 400, options.referencedMessage);
  }
  console.error(`Kesalahan ${context}:`, error);
  return fail(res, 500, options.defaultMessage || 'Terjadi kesalahan internal server');
};

module.exports = {
  HttpError,
  fail,
  getActorId,
  handleControllerError,
};
