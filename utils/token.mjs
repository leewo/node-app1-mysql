// utils/token.mjs

import jwt from 'jsonwebtoken';
import { getConfig } from '../config.mjs';

let JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, ACCESS_TOKEN_EXPIRY, REFRESH_TOKEN_EXPIRY;

export const initTokenConfig = () => {
    const config = getConfig();
    JWT_ACCESS_SECRET = config.JWT_ACCESS_SECRET;
    JWT_REFRESH_SECRET = config.JWT_REFRESH_SECRET;
    ACCESS_TOKEN_EXPIRY = config.ACCESS_TOKEN_EXPIRY;
    REFRESH_TOKEN_EXPIRY = config.REFRESH_TOKEN_EXPIRY;
};

export const generateAccessToken = (userId) => {
    return jwt.sign({ userId }, JWT_ACCESS_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
};

export const generateRefreshToken = (userId) => {
    return jwt.sign({ userId }, JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });
};

export const verifyAccessToken = (token) => {
    return jwt.verify(token, JWT_ACCESS_SECRET);
};

export const verifyRefreshToken = (token) => {
    return jwt.verify(token, JWT_REFRESH_SECRET);
};
