import mysql from 'mysql2/promise';
import { Client } from 'ssh2';
import logger from './logger.mjs';

let pool;

export async function connectToMySQL(sshConfig, dbConfig) {
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
                        stream,
                        ssl: false // SSL을 사용하지 않도록 설정
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