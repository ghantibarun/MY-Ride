const express = require('express');
const router = express.Router();
const { body } = require("express-validator")
const userController = require('../controllers/user.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const otpController = require('../controllers/otp.controller');


router.post('/register', [
    body('email').isEmail().withMessage('Invalid Email'),
    body('fullname.firstname').isLength({ min: 3 }).withMessage('First name must be at least 3 characters long'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    body('phone').optional().isMobilePhone().withMessage('Invalid phone number')
],
    userController.registerUser
)

router.post('/login', [
    body('email').isEmail().withMessage('Invalid Email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
],
    userController.loginUser
)

router.post('/send-otp',
    body('phone').isMobilePhone().withMessage('Invalid phone number'),
    otpController.user.send
);

router.post('/verify-otp',
    body('phone').isMobilePhone().withMessage('Invalid phone number'),
    body('otp').isLength({ min: 6, max: 6 }).isNumeric(),
    otpController.user.verify
);

router.get('/profile', authMiddleware.authUser, userController.getUserProfile)

router.get('/logout', authMiddleware.authUser, userController.logoutUser)



module.exports = router;