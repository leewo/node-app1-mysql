import logger from '../logger.mjs';
import { AppError } from '../utils/errors.mjs';
import { executeQuery } from '../connect-mysql.mjs';

export const getApartments = async (req, res) => {
    try {
        const { minLat, maxLat, minLng, maxLng, limit = 1000 } = req.query;

        const safeMinLat = minLat !== undefined ? parseFloat(minLat) : null;
        const safeMaxLat = maxLat !== undefined ? parseFloat(maxLat) : null;
        const safeMinLng = minLng !== undefined ? parseFloat(minLng) : null;
        const safeMaxLng = maxLng !== undefined ? parseFloat(maxLng) : null;
        const safeLimit = Math.min(parseInt(limit), 1000); // 최대 1000개로 제한

        let query = `SELECT 
                dong_code,
                Address2, 
                name,
                latitude, 
                longitude,
                complexNo
            FROM real_apartment_info`;
        let params = [];

        if (safeMinLat !== null && safeMaxLat !== null && safeMinLng !== null && safeMaxLng !== null) {
            query += ' WHERE latitude BETWEEN ? AND ? AND longitude BETWEEN ? AND ?';
            params = [safeMinLat, safeMaxLat, safeMinLng, safeMaxLng];
        }

        query += ' LIMIT ?';
        params.push(safeLimit);

        const apartments = await executeQuery(query, params);
        res.status(200).json(apartments);
    } catch (error) {
        logger.error('Error fetching apartments:', error);
        next(new AppError(`Error fetching apartments: ${error.message}`, 500));
    }
};

export const getPriceHistory = async (req, res, next) => {
    try {
        const priceHistory = await executeQuery(`
            SELECT 
                SEQ,
                Date,
                complexNo,
                Name,
                Area,
                Price,
                dealPriceMin,
                dealPriceMax,
                leasePriceMin,
                leasePriceMax,
                leasePriceRate,
                leasePriceRateMin,
                leasePriceRateMax
            FROM real_price_hist
            WHERE Date >= DATE_SUB(CURDATE(), INTERVAL 1 YEAR)
            ORDER BY complexNo, Date
            Limit 100
        `);

        const formattedPriceHistory = priceHistory.reduce((acc, row) => {
            if (!acc[row.complexNo]) {
                acc[row.complexNo] = [];
            }
            acc[row.complexNo].push(row);
            return acc;
        }, {});

        res.status(200).json(formattedPriceHistory);
    } catch (error) {
        logger.error('Error fetching price history:', error);
        next(new AppError(`Error fetching price history: ${error.message}`, 500));
    }
};
