// config.mjs

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let globalConfig = null;

export function loadEnv() {
    if (globalConfig) return globalConfig;

    dotenv.config({ path: join(__dirname, '.env') });

    const requiredEnvVars = [
        'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'ACCESS_TOKEN_EXPIRY', 'REFRESH_TOKEN_EXPIRY',
        'NODE_ENV', 'LISTEN_PORT', 'MYSQL_HOST', 'MYSQL_PORT', 'MYSQL_USER', 'MYSQL_PASSWORD', 'MYSQL_DATABASE'
    ];

    const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
    if (missingEnvVars.length > 0) {
        throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
    }

    globalConfig = {
        JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
        JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
        ACCESS_TOKEN_EXPIRY: process.env.ACCESS_TOKEN_EXPIRY,
        REFRESH_TOKEN_EXPIRY: process.env.REFRESH_TOKEN_EXPIRY,
        NODE_ENV: process.env.NODE_ENV,
        LISTEN_PORT: process.env.LISTEN_PORT,
        MYSQL_CONFIG: {
            host: process.env.MYSQL_HOST,
            port: parseInt(process.env.MYSQL_PORT, 10),
            user: process.env.MYSQL_USER,
            password: process.env.MYSQL_PASSWORD,
            database: process.env.MYSQL_DATABASE,
        },
        CORS_ORIGIN: process.env.CORS_ORIGIN
    };

    console.log('Listening on port:', globalConfig.LISTEN_PORT);
    console.log('MySQL Config:', {
        host: globalConfig.MYSQL_CONFIG.host,
        port: globalConfig.MYSQL_CONFIG.port,
        user: globalConfig.MYSQL_CONFIG.user,
        database: globalConfig.MYSQL_CONFIG.database
    });

    return globalConfig;
}

export function getConfig() {
    if (!globalConfig) {
        throw new Error('Config not loaded. Call loadEnv() first.');
    }
    return globalConfig;
}