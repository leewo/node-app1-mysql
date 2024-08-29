import logger from '../logger.mjs';
import { AppError } from '../utils/errors.mjs';
import { executeQuery } from '../connect-mysql.mjs';

export const getApartmentClusters = async (req, res) => {
    try {
        const { minLat, maxLat, minLng, maxLng, area } = req.query;

        const parseFloatOrDefault = (value, defaultValue) => {
            const parsed = parseFloat(value);
            return isNaN(parsed) || value === 'Infinity' ? defaultValue : parsed;
        };

        const parseIntOrDefault = (value, defaultValue) => {
            const parsed = parseInt(value);
            return isNaN(parsed) || value === 'Infinity' ? defaultValue : parsed;
        };

        const safeMinLat = parseFloatOrDefault(minLat, -90);
        const safeMaxLat = parseFloatOrDefault(maxLat, 90);
        const safeMinLng = parseFloatOrDefault(minLng, -180);
        const safeMaxLng = parseFloatOrDefault(maxLng, 180);

        let query = `
            SELECT 
              FLOOR((latitude - ?) / ? * 10) AS latGrid,
              FLOOR((longitude - ?) / ? * 10) AS lngGrid,
              COUNT(*) AS count,
              AVG(latitude) AS avgLat,
              AVG(longitude) AS avgLng
            FROM real_apartment_info
            WHERE latitude BETWEEN ? AND ?
              AND longitude BETWEEN ? AND ?
        `;

        const params = [
            safeMinLat, (safeMaxLat - safeMinLat),
            safeMinLng, (safeMaxLng - safeMinLng),
            safeMinLat, safeMaxLat,
            safeMinLng, safeMaxLng
        ];

        if (area !== 'all') {
            query += ' AND Area = ?';
            params.push(parseIntOrDefault(area, 0));
        }

        query += `
            GROUP BY latGrid, lngGrid
            HAVING latGrid IS NOT NULL AND lngGrid IS NOT NULL
        `;

        const clusters = await executeQuery(query, params);

        const formattedClusters = clusters.map(cluster => ({
            latitude: cluster.avgLat,
            longitude: cluster.avgLng,
            count: cluster.count
        }));

        res.status(200).json(formattedClusters);
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
