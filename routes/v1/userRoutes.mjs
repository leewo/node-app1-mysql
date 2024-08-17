// routes/v1/userRoutes.mjs
import { register, login, logout, getUser, changePassword, updateUserInfo } from '../../controllers/userController.mjs';
import { authenticateToken } from '../../middleware/auth.mjs';
import { registerValidator, validate } from '../../middleware/validators.mjs';
import { Router } from 'express'; // ES 모듈 문법을 사용하여 express 패키지에서 Router를 직접 import
// 중괄호 { } 를 사용하는 것은 named import를 의미하며, express 모듈에서 Router라는 이름의 export를 가져온다
const router = Router();          // import한 Router 함수를 호출하여 새로운 router 인스턴스를 생성. 이 부분은 CommonJS 문법과 동일

/**
 * @swagger
 * /api/v1/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 description: The user's full name
 *               email:
 *                 type: string
 *                 format: email
 *                 description: The user's email address
 *               password:
 *                 type: string
 *                 format: password
 *                 description: The user's password (min 8 characters)
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: User registered successfully
 *                 userId:
 *                   type: string
 *                   example: 60d5ecb74e4d7b2d1c5e7b2a
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Error registering user
 *                 error:
 *                   type: string
 */
router.post('/register', registerValidator, validate, register);

/**
 * @swagger
 * /api/v1/login:
 *   post:
 *     summary: Log in a user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: The user's email address
 *               password:
 *                 type: string
 *                 format: password
 *                 description: The user's password
 *     responses:
 *       200:
 *         description: User logged in successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: User logged in successfully
 *         headers:
 *           Set-Cookie:
 *             schema:
 *               type: string
 *               example: auth-token=abcde12345; HttpOnly; Secure; SameSite=Strict
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Invalid email or password
 */
router.post('/login', login);

/**
 * @swagger
 * /api/v1/logout:
 *   post:
 *     summary: Log out a user
 *     tags: [Users]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: User logged out successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: User logged out successfully
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Unauthorized
 */
router.post('/logout', authenticateToken, logout);

/**
 * @swagger
 * /api/v1/user:
 *   get:
 *     summary: Get user information
 *     tags: [Users]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: User information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: User retrieved successfully
 *                 user:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: 60d5ecb74e4d7b2d1c5e7b2a
 *                     name:
 *                       type: string
 *                       example: John Doe
 *                     email:
 *                       type: string
 *                       example: john@example.com
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Unauthorized
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: User not found
 */
router.get('/user', authenticateToken, getUser);

/**
 * @swagger
 * /api/v1/change-password:
 *   post:
 *     summary: Change user password
 *     tags: [Users]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 format: password
 *                 description: The user's current password
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 description: The user's new password
 *     responses:
 *       200:
 *         description: Password changed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Password changed successfully
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Current password is incorrect
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Unauthorized
 */
router.post('/change-password', authenticateToken, changePassword);

/**
 * @swagger
 * /api/v1/update-info:
 *   post:
 *     summary: Update user information
 *     tags: [Users]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: The user's new name (optional)
 *               email:
 *                 type: string
 *                 format: email
 *                 description: The user's new email (optional)
 *     responses:
 *       200:
 *         description: User information updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: User information updated successfully
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Unauthorized
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Error updating user information
 */
router.post('/update-info', authenticateToken, updateUserInfo);

export default router;
