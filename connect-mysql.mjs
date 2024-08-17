import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import mysql from 'mysql2/promise';
import { Client } from 'ssh2';
import logger from './logger.mjs';

// 현재 모듈의 디렉토리 경로를 얻습니다.
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

const sshConfig = {
    host: process.env.SSH_HOST,
    port: process.env.SSH_PORT || 22,
    username: process.env.SSH_USER,
    privateKey: readFileSync(privateKeyPath),
    debug: console.log  // SSH 연결 과정의 디버그 정보를 콘솔에 출력
};

console.log('SSH Config in connect-mysql.mjs:', sshConfig);

const dbConfig = {
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    port: process.env.MYSQL_PORT || 3306,
};

let pool;

export async function connectToMySQL() {
    return new Promise((resolve, reject) => {
        const ssh = new Client();

        ssh.on('ready', () => {
            logger.info('SSH connection established');

            ssh.forwardOut(
                '127.0.0.1',
                0,
                dbConfig.host,
                dbConfig.port,
                async (err, stream) => {
                    if (err) {
                        ssh.end();
                        return reject(err);
                    }

                    const poolConfig = {
                        ...dbConfig,
                        stream: stream,
                        ssl: { rejectUnauthorized: false }
                    };

                    try {
                        pool = mysql.createPool(poolConfig);
                        logger.info('MySQL connection pool created');

                        // Test the connection
                        await pool.getConnection();
                        logger.info('Successfully connected to MySQL database through SSH tunnel');
                        resolve();
                    } catch (error) {
                        logger.error('Error connecting to MySQL:', error);
                        ssh.end();
                        reject(error);
                    }
                }
            );
        });

        ssh.on('error', (err) => {
            logger.error('SSH connection error:', err);
            logger.error('SSH config:', {
                host: sshConfig.host,
                port: sshConfig.port,
                username: sshConfig.username,
                privateKeyPath: privateKeyPath
            });
            reject(err);

        });

        ssh.connect(sshConfig);
    });
}

export function getPool() {
    if (!pool) {
        throw new Error('MySQL pool not initialized. Call connectToMySQL first.');
    }
    return pool;
}

export function closeConnections() {
    return new Promise((resolve) => {
        if (pool) {
            pool.end(() => {
                logger.info('MySQL pool connections closed');
                resolve();
            });
        } else {
            resolve();
        }
    });
}