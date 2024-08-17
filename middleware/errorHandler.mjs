// middleware/errorHandler.mjs
import logger from '../logger.mjs';
import { AppError } from '../utils/errors.mjs';

export const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (err instanceof AppError) {
    err.isOperational = true;
  }

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else if (process.env.NODE_ENV === 'production') {
    sendErrorProd(err, res);
  }
};

const sendErrorDev = (err, res) => {
  logger.error(err);
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack
  });
};

const sendErrorProd = (err, res) => {
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message
    });
  } else {
    logger.error('ERROR 💥', err);
    res.status(500).json({
      status: 'error',
      message: 'Something went very wrong!'
    });
  }
};

// JWT 인증 관련 에러 처리를 위한 미들웨어
export const handleJWTError = (err, req, res, next) => {
  if (err.name === 'JsonWebTokenError') {
    return next(new AppError('Invalid token. Please log in again!', 401));
  }
  if (err.name === 'TokenExpiredError') {
    return next(new AppError('Your token has expired! Please log in again.', 401));
  }
  next(err);
};