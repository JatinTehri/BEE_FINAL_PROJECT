const sameOriginGuard = (req, res, next) => {
    const origin = req.get("origin");
    const host = req.get("host");

    if (!origin || !host) return next();

    try {
        const originHost = new URL(origin).host;
        if (originHost !== host) {
            return res.status(403).json({ success: false, message: "Invalid request origin" });
        }
    } catch {
        return res.status(403).json({ success: false, message: "Invalid request origin" });
    }

    next();
};

module.exports = sameOriginGuard;
