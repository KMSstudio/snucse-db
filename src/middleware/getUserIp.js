"use strict"

/**
 * Extracts the client's IP address from the request.
 * Works correctly behind proxies when `trust proxy` is set to `true` in the Express app.
 * Stores the extracted IP in `req.userIp` for later use in other middlewares or routes.
 */
function getUserIp(req, res, next) {
    const forwarded = req.headers['x-forwarded-for'];
    req.userIp = forwarded ? forwarded.split(',')[0].trim() : req.ip;
    next();
}

module.exports = getUserIp;