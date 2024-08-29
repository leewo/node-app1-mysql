import logger from '../logger.mjs';
import { AppError } from '../utils/errors.mjs';
import { executeQuery } from '../connect-mysql.mjs';

export const getApartmentClusters = async (req, res) => {
    try {
        const { minLat, maxLat, minLng, maxLng, minPrice, maxPrice, area, type } = req.query;

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
        const safeMinPrice = parseIntOrDefault(minPrice, 0);
        const safeMaxPrice = parseIntOrDefault(maxPrice, 999999999999); // 적절한 최대값 설정

        let query = `SELECT 
                       FLOOR((rai.latitude - ?) / ? * 10) as latGrid,
                       FLOOR((rai.longitude - ?) / ? * 10) as lngGrid,
                       COUNT(*) as count,
                       AVG(rai.latitude) as avgLat,
                       AVG(rai.longitude) as avgLng
                     FROM real_apartment_info rai
                     JOIN real_price_hist rph FORCE INDEX (idx_complexNo_dealPrices)
                       ON rai.complexNo = rph.complexNo
                       AND rph.dealPriceMin >= ?
                       AND rph.dealPriceMax <= ?
                     WHERE rai.latitude BETWEEN ? AND ?
                       AND rai.longitude BETWEEN ? AND ?
                    `;

        const params = [safeMinLat, (safeMaxLat - safeMinLat), safeMinLng, (safeMaxLng - safeMinLng),
            safeMinPrice, safeMaxPrice, safeMinLat, safeMaxLat, safeMinLng, safeMaxLng];

        if (area !== 'all') {
            query += ' AND rai.Area = ?';
            params.push(parseIntOrDefault(area, 0));
        }

        if (type !== 'all') {
            query += type === '매매' ? ' AND rph.dealPriceMin > 0' : ' AND rph.leasePriceMin > 0';
        }

        query += ` GROUP BY latGrid, lngGrid
                   WITH ROLLUP
                   HAVING latGrid IS NOT NULL AND lngGrid IS NOT NULL`;

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
