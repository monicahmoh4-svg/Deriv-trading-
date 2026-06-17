const REDACT_KEYS = new Set([
  'token', 'api_token', 'authorize', 'password', 'password_hash',
  'encrypted_token', 'jwt', 'authorization',
]);

function redact(value) {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = REDACT_KEYS.has(k.toLowerCase()) ? '[REDACTED]' : redact(v);
    }
    return out;
  }
  return value;
}

function info(label, payload) {
  if (payload !== undefined) {
    console.log(`[info] ${label}`, redact(payload));
  } else {
    console.log(`[info] ${label}`);
  }
}

function error(label, err) {
  console.error(`[error] ${label}`, err?.message || err);
}

module.exports = { info, error, redact };
