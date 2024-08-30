import logger from '../logger.mjs';
import { AppError } from '../utils/errors.mjs';
import { executeQuery } from '../connect-mysql.mjs';

export const getApartmentsInCluster = async (req, res) => {
    try {
        const { latGrid, lngGrid, minLat, maxLat, minLng, maxLng } = req.query;

        const query = `
            SELECT 
                dong_code,
                Address2, 
                name,
                latitude, 
                longitude,
                complexNo
            FROM real_apartment_info
            WHERE FLOOR((latitude - ?) / ? * 10) = ?
              AND FLOOR((longitude - ?) / ? * 10) = ?
              AND latitude BETWEEN ? AND ?
              AND longitude BETWEEN ? AND ?
            LIMIT 100
        `;

        const params = [
            minLat, (maxLat - minLat), parseInt(latGrid),
            minLng, (maxLng - minLng), parseInt(lngGrid),
            minLat, maxLat,
            minLng, maxLng
        ];

        const apartments = await executeQuery(query, params);
        res.status(200).json(apartments);
    } catch (error) {
        console.error('Error fetching apartments in cluster:', error);
        res.status(500).json({ message: 'Error fetching apartments in cluster', error: error.message });
    }
};

/*
쿼리 설명 (위도를 기준으로 설명)

- (latitude - safeMinLat)
     위도값(latitude)에서 최소 위도값(safeMinLat)을 뺀 것. 전체 위도 범위 내에서 해당 위치의 상대적 위치를 계산
     예: 위도가 37.5이고 최소 위도가 37.0이라면, 이 값은 0.5
- (safeMaxLat - safeMinLat)로 나누는 이유
     (safeMaxLat - safeMinLat)는 전체 위도 범위를 계산하는 값
     위에서 계산한 상대적 위치를 이 범위로 나누면, 0 이상 1 미만의 값을 얻게 된다
     이는 위도의 절대값에 관계없이 지도 화면상의 상대적인 위치를 나타내는 정규화된 값을 계산하게 된다
     예: 위도 범위가 37.0에서 38.0이라면, (37.5 - 37.0) / (38.0 - 37.0) = 0.5가 상대위치 값
- 10을 곱하는 이유
     정규화된 값(0 이상 1 미만)에 10을 곱하면 0이상 10 미만 사이의 값을 얻게 된다
     전체 위도 범위를 10개의 정수 구간으로 구분하기 위해 10을 곱한것임
     10 대신 다른 숫자를 사용하면 구간의 수를 변경된다. 예를 들어, 100을 곱하면 위도로 100개의 구간이 생긴다
- FLOOR 함수의 역할:
     위에서 10을 곱한 값에 최종적으로 FLOOR 함수를 적용하면 내림한 정수를 얻게되고 0 이상 10 미만의 정수구간 10개가 생긴다
     이 값이 연속적인 위도값을 이산적인 격자 ID로 변환한 값이다

경도도 10개의 구간으로 나누게 되면 지도 화면상에 10x10 총 100개의 영역이 생긴다
영역에 해당하는 아파트를 Group by 해서 count로 출력, 클라이언트로 제공한다
https://www.mermaidchart.com/raw/30be7de0-7763-4729-9b74-f0fb363cf282?theme=light&version=v0.1&format=svg
*/
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
              AVG(longitude) AS avgLng,
              GROUP_CONCAT(CONCAT_WS('|', name, Address2, latitude, longitude, complexNo) SEPARATOR ';;') AS apartments
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
            latGrid: cluster.latGrid,
            lngGrid: cluster.lngGrid,
            latitude: cluster.avgLat,
            longitude: cluster.avgLng,
            count: cluster.count,
            apartments: cluster.apartments.split(';;').map(apt => {
                const [name, address, lat, lng, complexNo] = apt.split('|');
                return { name, address, latitude: parseFloat(lat), longitude: parseFloat(lng), complexNo: parseInt(complexNo) };
            })
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
