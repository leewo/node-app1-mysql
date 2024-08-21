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
        // MySQL ���� ����
        await closeConnections();
        logger.info('MySQL connections closed.');

        // ���⿡ �ٸ� ���ҽ� ���� �۾� �߰� (��: Redis ���� ����, ���� �ڵ鷯 ���� ��)

        logger.info('Graceful shutdown completed.');
        process.exit(0);
    } catch (error) {
        logger.error('Error during graceful shutdown:', error);
        process.exit(1);
    }
};
