// middleware/auth.mjs
import { verifyAccessToken } from '../utils/token.mjs';
import { AppError } from '../utils/errors.mjs';
import { getPool } from '../connect-mysql.mjs';

export const authenticateToken = async (req, res, next) => {
    const accessToken = req.cookies.access_token;
    if (!accessToken) {
        // 토큰이 없는 경우, 인증되지 않은 사용자로 처리하고 다음 미들웨어로 넘깁니다.
        req.user = null;
        return next();
    }

    try {
        const decoded = verifyAccessToken(accessToken);
        const pool = await getPool();
        const [users] = await pool.execute('SELECT SEQ, USER_ID, USER_NAME FROM TL_USERS WHERE USER_ID = ?', [decoded.userId]);

        if (users.length === 0) {
            req.user = null;
        } else {
            req.user = { USER_ID: users[0].USER_ID, SEQ: users[0].SEQ };
        }
        next();
    } catch (error) {
        req.user = null;
        next();
    }
};
