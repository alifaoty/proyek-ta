// Kesalahan yang sengaja dilempar untuk membatalkan transaksi dengan status HTTP tertentu
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Helper standar untuk mengirim respons JSON error
const fail = (res, status, message) => res.status(status).json({ success: false, message });

module.exports = {
  HttpError,
  fail,
};
