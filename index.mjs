import dotenv from 'dotenv';
dotenv.config();

import dotenvSafe from 'dotenv-safe';
dotenvSafe.config({
    allowEmptyValues: true,
    example: '.env.example',
});

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

console.log('Environment variables loaded:', {
    SSH_HOST: process.env.SSH_HOST,
    SSH_PORT: process.env.SSH_PORT,
    SSH_USER: process.env.SSH_USER,
    MYSQL_HOST: process.env.MYSQL_HOST,
    MYSQL_USER: process.env.MYSQL_USER,
    MYSQL_DATABASE: process.env.MYSQL_DATABASE
});

// index.mjs
import express from 'express';
import v1Routes from './routes/v1/index.mjs';
import { connectToMySQL, closeConnections } from './connect-mysql.mjs';
import cors from 'cors';
import { errorHandler, handleJWTError } from './middleware/errorHandler.mjs';
import logger from './logger.mjs';
import cookieParser from 'cookie-parser';

// swagger-jsdoc와 swagger-ui-express 패키지를 import
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './swaggerConfig.js';
import fs from 'fs';
import yaml from 'js-yaml';

import path from 'path';

logger.info(process.env.JWT_SECRET);
logger.info(process.env.NODE_ENV);
logger.info(process.env.PORT);

async function startServer() {
    logger.info('try to connect connectToMySQL()');
    await connectToMySQL();
    logger.info('after connectToMySQL()');

    const app = express();
    {
        logger.info('add express middleware');
        // JSON 요청 본문과 URL-encoded 데이터를 파싱할 수 있게 해주는 미들웨어
        app.use(express.json());
        app.use(express.urlencoded({ extended: true }));

        // 쿠키 파서 미들웨어를 추가
        app.use(cookieParser());

        // CORS 미들웨어를 추가
        const corsOptions = {
            origin: process.env.CORS_ORIGIN.split(','),   // CORS_ORIGIN 환경 변수를 사용하여 허용할 오리진을 설정 (ex: http://localhost:3000). 여러 개의 오리진을 허용하려면 쉼표로 구분 (ex: http://localhost:3000,http://localhost:3001)
            credentials: true,                            // 클라이언트에서 쿠키를 전송하려면 credentials 옵션을 true로 설정해야 한다
            optionsSuccessStatus: 200                     // CORS 요청에 대한 응답 상태 코드를 200으로 설정
        };
        app.use(cors(corsOptions));

        // JWT 에러 처리
        app.use(handleJWTError);

        // 오류 처리 미들웨어를 추가
        app.use(errorHandler);

        app.use('/api/v1', v1Routes);

        // Swagger 미들웨어를 추가. /api-docs 경로로 API 문서를 확인할 수 있다
        // Swagger UI를 사용하여 API 문서를 시각적으로 확인할 수 있다
        // Swagger UI는 /api-docs 경로에 대한 GET 요청을 처리한다. 이 요청에 대한 응답으로 Swagger UI를 제공한다
        // Swagger UI는 Swagger 스펙을 사용하여 API 문서를 렌더링한다
        // Swagger 스펙은 OpenAPI 스펙을 사용하여 작성된 JSON 또는 YAML 파일이다
        {
            const __filename = fileURLToPath(import.meta.url);
            const __dirname = path.dirname(__filename);
            logger.info('현재 디렉토리:' + __dirname);
            logger.info('API 파일 경로:' + path.join(__dirname, './routes/v1/*.mjs'));

            const options = {
                definition: {
                    openapi: '3.0.0',
                    info: {
                        title: 'Sample API with Swagger',
                        version: '1.0.0',
                    },
                    // Swagger 설정에 쿠키 인증을 추가해야 한다
                    components: {
                        securitySchemes: {
                            cookieAuth: {
                                type: 'apiKey',
                                in: 'cookie',
                                name: 'auth-token'
                            }
                        }
                    }
                },
                apis: [path.join(__dirname, './routes/v1/*.mjs')],
            };

            const specs = swaggerJsdoc(options);
            // console.log('Swagger specs:', JSON.stringify(specs, null, 2));

            app.use('/api-docs/v1', swaggerUi.serve, swaggerUi.setup(specs));

            // /docs 디렉토리가 없으면 생성
            const docsDir = path.join(__dirname, 'docs');
            if (!fs.existsSync(docsDir)) {
                fs.mkdirSync(docsDir);
            }

            // Swagger YAML 파일 생성
            const swaggerYaml = yaml.dump(swaggerSpec);
            fs.writeFileSync(path.join(docsDir, 'swagger.yaml'), swaggerYaml, 'utf8');

            // Swagger JSON 파일 생성
            const swaggerJson = JSON.stringify(swaggerSpec, null, 2);
            fs.writeFileSync(path.join(docsDir, 'swagger.json'), swaggerJson, 'utf8');

            // Swagger YAML 파일 서빙
            app.get('/docs/swagger.yaml', (req, res) => {
                res.sendFile(path.join(__dirname, 'docs', 'swagger.yaml'));
            });

            // Swagger JSON 파일 서빙
            app.get('/docs/swagger.json', (req, res) => {
                res.sendFile(path.join(__dirname, 'docs', 'swagger.json'));
            });
        }
    }

    const port = process.env.PORT;
    app.listen(port, () => {
        logger.info(`Server is running on port ${port}`);
    });
}

startServer().catch(console.error);

// Graceful shutdown
process.on('SIGINT', async () => {
    await closeConnections();
    logger.info('MySQL connection closed.');
    process.exit(0);
});
