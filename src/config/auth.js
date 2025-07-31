const jwt = require('jsonwebtoken');
const SECRET_KEY = process.env.SECRET_KEY || 'clave_secreta_segura';

const verifyToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) {
        return res.status(403).json({ success: false, message: 'Token requerido' });
    }

    jwt.verify(token.replace("Bearer ", ""), SECRET_KEY, (err, decoded) => {
        if (err) {
            return res.status(401).json({ success: false, message: 'Token inválido' });
        }

        req.user = decoded;
        next();
    });
};

module.exports = verifyToken;
