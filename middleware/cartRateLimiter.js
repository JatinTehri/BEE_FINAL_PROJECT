const { CART_WINDOW_MS, CART_MAX_REQUESTS } = require("../config/constants");

const cartRateLimitStore = new Map();

const cartRateLimiter = (req, res, next) => {
    const staleThreshold = Date.now() - CART_WINDOW_MS;
    for (const [storedKey, entry] of cartRateLimitStore.entries()) {
        if (entry.start < staleThreshold) {
            cartRateLimitStore.delete(storedKey);
        }
    }

    const key = `${req.ip}:${req.path}`;
    const now = Date.now();
    const entry = cartRateLimitStore.get(key);

    if (!entry || now - entry.start > CART_WINDOW_MS) {
        cartRateLimitStore.set(key, { start: now, count: 1 });
        return next();
    }

    if (entry.count >= CART_MAX_REQUESTS) {
        return res.status(429).json({ success: false, message: "Too many requests" });
    }

    entry.count += 1;
    cartRateLimitStore.set(key, entry);
    next();
};

module.exports = cartRateLimiter;
