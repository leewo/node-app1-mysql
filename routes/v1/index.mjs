import { Router } from 'express';
import userRoutes from './userRoutes.mjs';
import apartmentRoutes from './apartmentRoutes.mjs';

const v1Router = Router();

v1Router.use('/', userRoutes);
v1Router.use('/', apartmentRoutes);

export default v1Router;
