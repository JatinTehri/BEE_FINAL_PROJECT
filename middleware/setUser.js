const jwt = require("jsonwebtoken");
const User = require("../models/User");

const attachUser = async (req, res, next) => {
    const token = req.cookies.token;

    if (!token) {
        res.locals.user = null;
        return next();
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        res.locals.user = user || null;
    } catch {
        res.locals.user = null;
    }

    next();
};

module.exports = attachUser;
