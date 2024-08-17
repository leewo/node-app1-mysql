// connect-mysql.mjs
import mysql from 'mysql2/promise';
import { Client } from 'ssh2';
import logger from './logger.mjs';

let pool;

export async function connectToMySQL(SSH_CONFIG, MYSQL_CONFIG) {
    return new Promise((resolve, reject) => {
        const ssh = new Client();

        ssh.on('ready', () => {
            logger.info('SSH connection established');

            ssh.forwardOut(
                '127.0.0.1',
                0,
                MYSQL_CONFIG.host,
                MYSQL_CONFIG.port,
                async (err, stream) => {
                    if (err) {
                        ssh.end();
                        return reject(err);
                    }

                    const poolConfig = {
                        ...MYSQL_CONFIG,
                        stream,
                        ssl: false // SSL을 사용하지 않도록 설정
                    };

                    try {
                        pool = mysql.createPool(poolConfig);
                        logger.info('MySQL connection pool created');

                        //// Test the connection and execute a query
                        //const connection = await pool.getConnection();
                        //try {
                        //    logger.info('Successfully connected to MySQL database through SSH tunnel');

                        //    // Execute the query
                        //    const [rows, fields] = await connection.execute('SELECT * FROM TL_USERS');
                        //    logger.info('Query result:', rows);

                        //} catch (queryError) {
                        //    logger.error('Error executing query:', queryError);
                        //    reject(queryError);
                        //} finally {
                        //    // Release the connection back to the pool
                        //    connection.release();
                        //}

                        resolve();
                    } catch (error) {
                        logger.error('Error connecting to MySQL:', error);
                        ssh.end();
                        reject(error);
                    }
                }
            );
        });

        ssh.on('debug', (message) => {
            console.log('SSH Debug:', message);
        });

        ssh.on('error', (err) => {
            logger.error('SSH connection error:', err);
            logger.error('SSH config:', {
                host: SSH_CONFIG.host,
                port: SSH_CONFIG.port,
                username: SSH_CONFIG.username,
                privateKeyPath: SSH_CONFIG.privateKeyPath
            });
            reject(err);

        });

        ssh.connect(SSH_CONFIG);
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