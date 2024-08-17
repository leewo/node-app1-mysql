// controllers/userController.mjs

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import logger from '../logger.mjs';
import { AppError } from '../utils/errors.mjs';
import { getPool } from '../connect-mysql.mjs';

export const register = async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        const pool = getPool();
        const [result] = await pool.execute(
            'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
            [req.body.name, req.body.email, hashedPassword]
        );
        logger.info('User registered successfully:', { userId: result.insertId });
        res.status(201).json({ message: 'User registered successfully', userId: result.insertId });
    } catch (error) {
        logger.error('Registration error:', error);
        res.status(400).json({ message: 'Error registering user', error: error.message });
    }
};

export const login = async (req, res) => {
    try {
        const pool = getPool();
        const [users] = await pool.execute('SELECT SEQ, USER_ID, USER_NAME, PASSWORD FROM TL_USERS WHERE USER_ID = ?', [req.body.email]);
        if (users.length === 0) {
            throw new AppError('Invalid email or password', 401);
        }
        const user = users[0];
        const validPassword = await bcrypt.compare(req.body.password, user.password);
        if (!validPassword) {
            throw new AppError('Invalid email or password', 401);
        }

        const token = jwt.sign(
            { _id: user._id },
            process.env.JWT_SECRET,   // JWT_SECRET 환경 변수를 사용하여 비밀 키를 가져옴. dotenv를 사용하여 환경 변수를 로드. JWT_SECRET을 .env 파일에 설정해야 한다
            { expiresIn: '1h' }
        );

        // HttpOnly 쿠키로 토큰 설정
        res.cookie('auth-token', token, {
            httpOnly: true,                                 // 토큰을 HttpOnly 쿠키로 설정. 이는 클라이언트 측 JavaScript에서 쿠키에 접근할 수 없게 하여 XSS 공격으로부터 보호한다
            secure: process.env.NODE_ENV === 'production',  // 프로덕션 환경에서는 secure 옵션을 true로 설정하여 HTTPS에서만 쿠키가 전송되도록 한다
            sameSite: 'strict',                             // sameSite 옵션을 'strict'로 설정하여 쿠키가 동일 출처에서만 전송되도록 한다. CSRF 공격을 방지하기 위한 것
            maxAge: 24 * 60 * 60 * 1000                     // maxAge 옵션을 사용하여 쿠키의 만료 시간을 설정. 이 경우 24시간
        });

        logger.info('User logged in successfully:', { userId: user._id });

        res.status(200).json({ message: 'User logged in successfully' });
    } catch (error) {
        logger.error('Login error:', { error: 'details' });

        res.status(400).json({ message: 'Error logging in', error: error.message });
    }
};

export const logout = (req, res) => {
    res.clearCookie('auth-token');
    res.status(200).json({ message: 'User logged out successfully' });
}

export const getUser = async (req, res, next) => {
    try {
        const pool = getPool();
        const [users] = await pool.execute('SELECT SEQ, USER_ID, USER_NAME, PASSWORD FROM TL_USERS WHERE USER_ID = ?', [req.user.id]);
        if (users.length === 0) {
            return next(new AppError('User not found', 404));
        }
        res.status(200).json({ message: 'User retrieved successfully', user: users[0] });
    } catch (error) {
        next(new AppError('Error getting user', 500));
    }
};

export const changePassword = async (req, res, next) => {
    try {
        const pool = getPool();
        const [users] = await pool.execute('SELECT SEQ, USER_ID, USER_NAME, PASSWORD FROM TL_USERS WHERE USER_ID = ?', [req.user.id]);
        if (users.length === 0) {
            return next(new AppError('User not found', 404));
        }
        const user = users[0];
        const validPassword = await bcrypt.compare(req.body.currentPassword, user.password);
        if (!validPassword) {
            throw new AppError('Current password is incorrect', 400);
        }
        const hashedNewPassword = await bcrypt.hash(req.body.newPassword, 10);
        await pool.execute('UPDATE users SET password = ? WHERE id = ?', [hashedNewPassword, user.id]);
        res.status(200).json({ message: 'Password changed successfully' });
    } catch (error) {
        next(new AppError('Error changing password', 500));
    }
};

export const updateUserInfo = async (req, res, next) => {
    try {
        const pool = getPool();
        const [users] = await pool.execute('SELECT SEQ, USER_ID, USER_NAME, PASSWORD FROM TL_USERS WHERE USER_ID = ?', [req.user.id]);
        if (users.length === 0) {
            return next(new AppError('User not found', 404));
        }
        const user = users[0];
        const oldUserInfo = { name: user.name, email: user.email };
        const newName = req.body.name || user.name;
        const newEmail = req.body.email || user.email;
        await pool.execute('UPDATE users SET name = ?, email = ? WHERE id = ?', [newName, newEmail, user.id]);
        logger.info(`User info updated. Old: ${JSON.stringify(oldUserInfo)}, New: ${JSON.stringify({ name: newName, email: newEmail })}`);
        res.status(200).json({ message: 'User information updated successfully' });
    } catch (error) {
        logger.error(`Error updating user information: ${error.message}`);
        next(new AppError('Error updating user information', 500));
    }
};
