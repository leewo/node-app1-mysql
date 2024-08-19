// connect-mysql.mjs
import mysql from 'mysql2/promise';
import { Client } from 'ssh2';
import logger from './logger.mjs';
import { getConfig } from './config.mjs';

let pool;
let sshClient;

const createPool = (config) => {
    return mysql.createPool({
        ...config,
        connectionLimit: 10,
        waitForConnections: true,
        queueLimit: 0,
    });
};

const connectToDatabase = async () => {
    const { SSH_CONFIG, MYSQL_CONFIG } = getConfig();
    return new Promise((resolve, reject) => {
        sshClient = new Client();

        sshClient.on('ready', () => {
            sshClient.forwardOut(
                '127.0.0.1',
                0,
                MYSQL_CONFIG.host,
                MYSQL_CONFIG.port,
                async (err, stream) => {
                    if (err) {
                        sshClient.end();
                        return reject(err);
                    }

                    const poolConfig = {
                        ...MYSQL_CONFIG,
                        stream,
                        ssl: false // SSL을 사용하지 않도록 설정
                    };

                    try {
                        pool = createPool(poolConfig);
                        logger.info('MySQL connection pool created');
                        resolve(pool);
                    } catch (error) {
                        logger.error('Error creating MySQL pool:', error);
                        sshClient.end();
                        reject(error);
                    }
                }
            );
        });

        sshClient.on('debug', (message) => {
            console.log('SSH Debug:', message);
        });

        sshClient.on('error', (err) => {
            logger.error('SSH connection error:', err);
            logger.error('SSH config:', {
                host: SSH_CONFIG.host,
                port: SSH_CONFIG.port,
                username: SSH_CONFIG.username,
                privateKeyPath: SSH_CONFIG.privateKeyPath
            });
            reject(err);
        });

        sshClient.connect(SSH_CONFIG);
    });
};

export const getPool = async () => {
    if (!pool) {
        try {
            await connectToDatabase();
        } catch (error) {
            logger.error('Failed to connect to the database:', error);
            throw error;
        }
    }
    return pool;
};

export const executeQuery = async (query, params, retries = 3) => {
    try {
        const pool = await getPool();
        const [results] = await pool.execute(query, params);
        return results;
    } catch (error) {
        if (error.code === 'PROTOCOL_CONNECTION_LOST' && retries > 0) {
            logger.warn(`Database connection was lost. Retrying... (${retries} attempts left)`);
            pool = null; // Reset the pool
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for 1 second before retrying
            return executeQuery(query, params, retries - 1);
        }
        logger.error('Database query error:', error);
        throw error;
    }
};

export const closeConnections = async () => {
    if (pool) {
        await pool.end();
        logger.info('MySQL pool connections closed');
    }
    if (sshClient) {
        sshClient.end();
        logger.info('SSH connection closed');
    }
};
