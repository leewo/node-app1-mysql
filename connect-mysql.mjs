import mysql from 'mysql2/promise';
import logger from './logger.mjs';
import { getConfig } from './config.mjs';
import util from 'util';

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

        // 쿼리와 파라미터를 합쳐서 포맷팅
        const formattedQuery = mysql.format(query, params);

        logger.info('Executing query:', {
            formattedQuery: formattedQuery.replace(/\s+/g, ' ').trim()
        });

        const start = Date.now(); // 쿼리 실행 시작 시간

        // undefined 값을 null로 변환
        const safeParams = params ? params.map(param => param === undefined ? null : param) : [];
        const [results] = await pool.execute(query, safeParams);

        const end = Date.now(); // 쿼리 실행 종료 시간
        const duration = end - start; // 쿼리 실행 시간 (밀리초)

        // 쿼리 실행 결과 로깅
        logger.info('Query executed successfully', {
            query: util.inspect(formattedQuery, { depth: null, colors: false }),
            params: util.inspect(safeParams, { depth: null, colors: false }),
            duration: `${duration}ms`,
            rowCount: results.length
        });

        return results;
    } catch (error) {
        const formattedQuery = query.replace(/\s+/g, ' ').trim();
        logger.error('Database query error:', {
            error: util.inspect(error, { depth: null, colors: false }),
            query: util.inspect(formattedQuery, { depth: null, colors: false }),
            params: util.inspect(params, { depth: null, colors: false })
        });
        throw error;
    }
};

export const closeConnections = async () => {
    if (pool) {
        await pool.end();
        logger.info('MySQL pool connections closed');
    }
};
