import mysql from 'mysql2/promise';
import logger from './logger.mjs';

export function getPoolConfig() {
    return {
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    };
}

let pool;

export async function connectToMySQL() {
    if (!pool) {
        const poolConfig = getPoolConfig();
        pool = mysql.createPool(poolConfig);
    }

    try {
        logger.info('Attempting to connect to MySQL...');
        await pool.getConnection();
        logger.info('Successfully connected to MySQL database');
    } catch (error) {
        logger.error('Error connecting to MySQL:', error);
        throw error;
    }
}

export function getPool() {
    if (!pool) {
        throw new Error('MySQL pool not initialized. Call connectToMySQL first.');
    }
    return pool;
}