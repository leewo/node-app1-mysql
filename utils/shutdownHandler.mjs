// utils/shutdownHandler.mjs

import logger from '../logger.mjs';
import { closeConnections } from '../connect-mysql.mjs';

let isShuttingDown = false;

export const gracefulShutdown = async (signal) => {
    if (isShuttingDown) {
        logger.info('Shutdown already in progress');
        return;
    }

    isShuttingDown = true;
    logger.info(`${signal} received. Starting graceful shutdown...`);

    try {
        // MySQL 연결 종료
        await closeConnections();
        logger.info('MySQL connections closed.');

        // 여기에 다른 리소스 정리 작업 추가 (예: Redis 연결 종료, 파일 핸들러 정리 등)

        logger.info('Graceful shutdown completed.');
        process.exit(0);
    } catch (error) {
        logger.error('Error during graceful shutdown:', error);
        process.exit(1);
    }
};
