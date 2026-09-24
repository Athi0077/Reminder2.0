const express = require('express');
const router = express.Router();
const { registerUser, loginUser, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { check, validationResult } = require('express-validator');

// Validation middleware generator
const validate = validations => {
  return async (req, res, next) => {
    await Promise.all(validations.map(validation => validation.run(req)));
    const errors = validationResult(req);
    if (errors.isEmpty()) return next();
    res.status(400).json({ message: errors.array()[0].msg });
  };
};

router.post('/register', validate([
  check('name', 'Name is required').notEmpty(),
  check('email', 'Please include a valid email').isEmail(),
  check('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 })
]), registerUser);

router.post('/login', validate([
  check('email', 'Please include a valid email').isEmail(),
  check('password', 'Password is required').exists()
]), loginUser);

router.get('/me', protect, getMe);

module.exports = router;
