// middleware/validators.mjs
import { body, validationResult } from 'express-validator';

const passwordValidator = body('password')
  .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
  .matches(/\d/).withMessage('Password must contain a number')
  .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
  .matches(/[a-z]/).withMessage('Password must contain a lowercase letter')
  .matches(/[!@#$%^&*(),.?":{}|<>]/).withMessage('Password must contain a special character');

export const registerValidator = [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Invalid email'),
  passwordValidator
];

export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }
  return res.status(400).json({ errors: errors.array() });
};
