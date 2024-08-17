import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, existsSync } from 'fs';

// 현재 모듈의 디렉토리 경로를 얻습니다.
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function loadEnv() {
    dotenv.config({ path: join(__dirname, '.env') });

    const requiredEnvVars = [
        'JWT_SECRET', 'NODE_ENV', 'PORT', 'SSH_HOST', 'SSH_PORT', 'SSH_USER',
        'MYSQL_HOST', 'MYSQL_USER', 'MYSQL_PASSWORD', 'MYSQL_DATABASE'
    ];

    const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

    if (missingEnvVars.length > 0) {
        throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
    }

    // 프로젝트 루트 디렉토리 (index.mjs가 있는 위치)를 기준으로 private key 경로를 설정합니다.
    const privateKeyPath = join(__dirname, 'private_key', 'id_rsa');

    // private key 파일 존재 여부를 확인합니다.
    if (!existsSync(privateKeyPath)) {
        throw new Error(`Private key file not found at ${privateKeyPath}`);
    }

    console.log('SSH Config:', {
        host: process.env.SSH_HOST,
        port: process.env.SSH_PORT,
        username: process.env.SSH_USER
    });

    return {
        JWT_SECRET: process.env.JWT_SECRET,
        NODE_ENV: process.env.NODE_ENV,
        PORT: parseInt(process.env.PORT, 10),
        SSH_CONFIG: {
            host: process.env.SSH_HOST,
            port: parseInt(process.env.SSH_PORT, 10),
            username: process.env.SSH_USER,
            privateKey: readFileSync(privateKeyPath),
            debug: console.log  // SSH 연결 과정의 디버그 정보를 콘솔에 출력
        },
        MYSQL_CONFIG: {
            host: process.env.MYSQL_HOST,
            user: process.env.MYSQL_USER,
            password: process.env.MYSQL_PASSWORD,
            database: process.env.MYSQL_DATABASE,
            port: parseInt(process.env.MYSQL_PORT, 10) || 3306
        }
    };
}