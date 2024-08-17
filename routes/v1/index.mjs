// routes/v1/index.mjs
import { Router } from 'express';
import userRoutes from './userRoutes.mjs';

const v1Router = Router();

v1Router.use('/', userRoutes);  // '/users' 대신 '/'를 사용

export default v1Router;
