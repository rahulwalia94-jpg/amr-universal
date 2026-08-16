// Small in-memory rate limiter — dignified spam control without a CAPTCHA.
// Fixed window per IP; suitable for a single-instance deployment.

const buckets = new Map();

function rateLimit({ windowMs = 10 * 60 * 1000, max = 12 } = {}) {
  return (req, res, next) => {
    const now = Date.now();
    const key = `${req.ip}:${req.path}`;
    let bucket = buckets.get(key);
    if (!bucket || now - bucket.start > windowMs) {
      bucket = { start: now, count: 0 };
      buckets.set(key, bucket);
    }
    bucket.count += 1;
    if (bucket.count > max) {
      return res.status(429).json({ ok: false, error: 'Too many requests. Please try again shortly.' });
    }
    next();
  };
}

// Hourly sweep so the map does not grow without bound.
setInterval(() => {
  const cutoff = Date.now() - 60 * 60 * 1000;
  for (const [key, bucket] of buckets) {
    if (bucket.start < cutoff) buckets.delete(key);
  }
}, 60 * 60 * 1000).unref();

module.exports = { rateLimit };
