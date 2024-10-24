// authMiddleware.js
const JwtManage = require('../models/JwtManage');

const ensureAuth = (req, res, next) => {
    const token = req.cookies?.token;
    if (!token) { req.user = null; }

    const user = JwtManage.get(token);
    if (!user) { req.user = null; }

    req.user = user;
    next();
};

module.exports = ensureAuth;
