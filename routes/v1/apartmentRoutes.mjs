import { Router } from 'express';
import { getApartments, getPriceHistory } from '../../controllers/apartmentController.mjs';

const router = Router();

/**
 * @swagger
 * /api/v1/apartments:
 *   get:
 *     summary: Get all apartments
 *     tags: [Apartments]
 *     responses:
 *       200:
 *         description: List of apartments
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   dong_code:
 *                     type: integer
 *                   Address2:
 *                     type: string
 *                   name:
 *                     type: string
 *                   latitude:
 *                     type: number
 *                   longitude:
 *                     type: number
 *                   complexNo:
 *                     type: integer
 */
router.get('/apartments', getApartments);

/**
 * @swagger
 * /api/v1/price-history:
 *   get:
 *     summary: Get price history for all apartments
 *     tags: [Apartments]
 *     responses:
 *       200:
 *         description: Price history for apartments
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     SEQ:
 *                       type: integer
 *                     Date:
 *                       type: integer
 *                     complexNo:
 *                       type: integer
 *                     Name:
 *                       type: string
 *                     Area:
 *                       type: integer
 *                     Price:
 *                       type: number
 *                     dealPriceMin:
 *                       type: integer
 *                     dealPriceMax:
 *                       type: integer
 *                     leasePriceMin:
 *                       type: integer
 *                     leasePriceMax:
 *                       type: integer
 *                     leasePriceRate:
 *                       type: number
 *                     leasePriceRateMin:
 *                       type: integer
 *                     leasePriceRateMax:
 *                       type: integer
 */
router.get('/price-history', getPriceHistory);

export default router;
