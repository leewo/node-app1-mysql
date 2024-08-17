// middleware/auth.mjs
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/errors.mjs';
import { getPool } from '../connect-mysql.mjs';

export const authenticateToken = async (req, res, next) => {
    const token = req.cookies['auth-token'];
    if (!token) {
        return next(new AppError('Unauthorized - No token provided', 401));
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const pool = getPool();
        const [users] = await pool.execute('SELECT SEQ, USER_ID, USER_NAME, PASSWORD FROM TL_USERS WHERE USER_ID = ?', [decoded.id]);
        if (users.length === 0) {
            return next(new AppError('User not found', 404));
        }
        req.user = { id: users[0].id };
        next();
    } catch (error) {
        next(error);
    }
};