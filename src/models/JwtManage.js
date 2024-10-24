// JwtManage.js

const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.JWT_SECRET_KEY;
const EXPIRE_IN  = process.env.JWT_EXPIRE_IN;

class JwtManage {
    /**
     * create: Creates a JWT token from user object.
     * @param {Object} user - The user object containing name, class, email.
     * @returns {string} - The generated JWT token.
     */
    static create(user) {
        const payload = {
            name: user.name,
            class: user.class,
            email: user.email
        };

        const token = jwt.sign(payload, SECRET_KEY, { expiresIn: EXPIRE_IN });
        return token;
    }

    /**
     * get: Verifies the JWT token and extracts user information.
     * @param {string} token - The JWT token to verify.
     * @returns {Object|null} - The decoded user information if valid, otherwise null.
     */
    static get(token) {
        try { return jwt.verify(token, SECRET_KEY); }
        catch (err) { return null; }
    }
}

module.exports = JwtManage;