// middleware/auth.mjs
import { verifyAccessToken } from '../utils/token.mjs';
import { AppError } from '../utils/errors.mjs';
import { getPool } from '../connect-mysql.mjs';

export const authenticateToken = async (req, res, next) => {
    const accessToken = req.cookies.access_token;
    if (!accessToken) {
        return next(new AppError('Access token not found', 401));
    }

    try {
        const decoded = verifyAccessToken(accessToken);
        const pool = await getPool();
        const connection = await pool.getConnection();
        const [users] = await connection.execute('SELECT SEQ, USER_ID, USER_NAME FROM TL_USERS WHERE USER_ID = ?', [decoded.userId]);
        connection.release();

        if (users.length === 0) {
            return next(new AppError('User not found', 404));
        }
        req.user = { USER_ID: users[0].USER_ID, SEQ: users[0].SEQ };
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Access token expired' });
        }
        next(error);
    }
};