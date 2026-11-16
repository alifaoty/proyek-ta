const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_toko_ban_velg_key_2026';
const JWT_EXPIRES_IN = '24h';

module.exports = {
  JWT_SECRET,
  JWT_EXPIRES_IN,
};
