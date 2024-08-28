import logger from '../logger.mjs';
import { AppError } from '../utils/errors.mjs';
import { executeQuery } from '../connect-mysql.mjs';

export const getApartmentClusters = async (req, res) => {
    try {
        const { minLat, maxLat, minLng, maxLng, minPrice, maxPrice, area, type } = req.query;

        const safeMinLat = minLat !== undefined ? parseFloat(minLat) : null;
        const safeMaxLat = maxLat !== undefined ? parseFloat(maxLat) : null;
        const safeMinLng = minLng !== undefined ? parseFloat(minLng) : null;
        const safeMaxLng = maxLng !== undefined ? parseFloat(maxLng) : null;
        const safeMinPrice = minPrice !== undefined ? parseInt(minPrice) : 0;
        const safeMaxPrice = maxPrice !== undefined ? parseInt(maxPrice) : Infinity;

        let query = `
      SELECT 
        FLOOR((latitude - ?) / ? * 10) as latGrid,
        FLOOR((longitude - ?) / ? * 10) as lngGrid,
        COUNT(*) as count,
        AVG(latitude) as avgLat,
        AVG(longitude) as avgLng
      FROM real_apartment_info rai
      JOIN real_price_hist rph ON rai.complexNo = rph.complexNo
      WHERE latitude BETWEEN ? AND ?
        AND longitude BETWEEN ? AND ?
        AND rph.dealPriceMin >= ?
        AND rph.dealPriceMax <= ?
    `;

        const params = [safeMinLat, (safeMaxLat - safeMinLat), safeMinLng, (safeMaxLng - safeMinLng),
            safeMinLat, safeMaxLat, safeMinLng, safeMaxLng, safeMinPrice, safeMaxPrice];

        if (area !== 'all') {
            query += ' AND rai.Area = ?';
            params.push(parseInt(area));
        }

        if (type !== 'all') {
            query += type === '매매' ? ' AND rph.dealPriceMin > 0' : ' AND rph.leasePriceMin > 0';
        }

        query += ' GROUP BY latGrid, lngGrid';

        const clusters = await executeQuery(query, params);

        const formattedClusters = clusters.map(cluster => ({
            latitude: cluster.avgLat,
            longitude: cluster.avgLng,
            count: cluster.count
        }));

        res.json(formattedClusters);
    } catch (error) {
        console.error('Error fetching apartment clusters:', error);
        res.status(500).json({ message: 'Error fetching apartment clusters', error: error.message });
    }
};

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
