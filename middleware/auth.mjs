// middleware/auth.mjs
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/errors.mjs';
import { getPool } from '../connect-mysql.mjs';
import { getConfig } from '../config.mjs';

export const authenticateToken = async (req, res, next) => {
    const token = req.cookies['auth-token'];
    if (!token) {
        return next(new AppError('Unauthorized - No token provided', 401));
    }

    try {
        const { JWT_SECRET } = getConfig();
        const decoded = jwt.verify(token, JWT_SECRET);
        const pool = await getPool();
        const connection = await pool.getConnection();
            const [users] = await connection.execute('SELECT SEQ, USER_ID, USER_NAME FROM TL_USERS WHERE USER_ID = ?', [decoded.USER_ID]);
        const length = users.length;
        if (connection) connection.release();
        if (length === 0) {
                return next(new AppError('User not found', 404));
            }
            req.user = { USER_ID: users[0].USER_ID, SEQ: users[0].SEQ };
            next();
    } catch (error) {
        next(error);
    }
};
