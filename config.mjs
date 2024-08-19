// config.mjs
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let globalConfig = null;

export function loadEnv() {
    if (globalConfig) return globalConfig;

    dotenv.config({ path: join(__dirname, '.env') });

    const requiredEnvVars = [
        'JWT_SECRET', 'NODE_ENV', 'LISTEN_PORT', 'SSH_HOST', 'SSH_PORT', 'SSH_USER',
        'MYSQL_HOST', 'MYSQL_USER', 'MYSQL_PASSWORD', 'MYSQL_DATABASE'
    ];

    const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
    if (missingEnvVars.length > 0) {
        throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
    }

    const privateKeyPath = join(__dirname, 'private_key', 'id_rsa');
    if (!existsSync(privateKeyPath)) {
        throw new Error(`Private key file not found at ${privateKeyPath}`);
    }

    globalConfig = {
        JWT_SECRET: process.env.JWT_SECRET,
        NODE_ENV: process.env.NODE_ENV,
        LISTEN_PORT: process.env.LISTEN_PORT,
        SSH_CONFIG: {
            host: process.env.SSH_HOST,
            port: process.env.SSH_PORT || 22,
            username: process.env.SSH_USER,
            privateKey: readFileSync(privateKeyPath),
            debug: console.log
        },
        MYSQL_CONFIG: {
            host: process.env.MYSQL_HOST,
            user: process.env.MYSQL_USER,
            password: process.env.MYSQL_PASSWORD,
            database: process.env.MYSQL_DATABASE,
            port: parseInt(process.env.MYSQL_PORT, 10) || 3306
        },
        CORS_ORIGIN: process.env.CORS_ORIGIN
    };

    console.log('Listening on port:', globalConfig.LISTEN_PORT);
    console.log('SSH Config:', {
        host: globalConfig.SSH_CONFIG.host,
        port: globalConfig.SSH_CONFIG.port,
        username: globalConfig.SSH_CONFIG.username
    });

    return globalConfig;
}

export function getConfig() {
    if (!globalConfig) {
        throw new Error('Config not loaded. Call loadEnv() first.');
    }
    return globalConfig;
}
