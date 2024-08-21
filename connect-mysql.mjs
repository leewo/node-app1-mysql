// connect-mysql.mjs

import mysql from 'mysql2/promise';
import logger from './logger.mjs';
import { getConfig } from './config.mjs';

let pool;

const createPool = (config) => {
    return mysql.createPool({
        ...config,
        connectionLimit: 10,
        waitForConnections: true,
        queueLimit: 0,
    });
};

export const connectToDatabase = async () => {
    const { MYSQL_CONFIG } = getConfig();
    try {
        pool = createPool(MYSQL_CONFIG);
        logger.info('MySQL connection pool created');
        return pool;
    } catch (error) {
        logger.error('Error creating MySQL pool:', error);
        throw error;
    }
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
        if (error.code === 'ECONNREFUSED' && retries > 0) {
            logger.warn(`Database connection was refused. Retrying... (${retries} attempts left)`);
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
};
