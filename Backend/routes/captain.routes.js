const captainController = require('../controllers/captain.controller');
const express = require('express');
const router = express.Router();
const { body } = require("express-validator")
const authMiddleware = require('../middlewares/auth.middleware');
const otpController = require('../controllers/otp.controller');


router.post('/register', [
    body('email').isEmail().withMessage('Invalid Email'),
    body('fullname.firstname').isLength({ min: 3 }).withMessage('First name must be at least 3 characters long'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    body('vehicle.color').isLength({ min: 3 }).withMessage('Color must be at least 3 characters long'),
    body('vehicle.plate').isLength({ min: 3 }).withMessage('Plate must be at least 3 characters long'),
    body('vehicle.capacity').isInt({ min: 1 }).withMessage('Capacity must be at least 1'),
    body('vehicle.vehicleType').isIn([ 'car', 'motorcycle', 'auto' ]).withMessage('Invalid vehicle type'),
    body('phone').optional().isMobilePhone().withMessage('Invalid phone number'),
    body('drivingLicense').optional().isString(),
    body('rcNumber').optional().isString(),
    body('insuranceNumber').optional().isString()
],
    captainController.registerCaptain
)


router.post('/login', [
    body('email').isEmail().withMessage('Invalid Email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
],
    captainController.loginCaptain
)

router.post('/send-otp',
    body('phone').isMobilePhone().withMessage('Invalid phone number'),
    otpController.captain.send
);

router.post('/verify-otp',
    body('phone').isMobilePhone().withMessage('Invalid phone number'),
    body('otp').isLength({ min: 6, max: 6 }).isNumeric(),
    otpController.captain.verify
);


router.get('/profile', authMiddleware.authCaptain, captainController.getCaptainProfile)

router.get('/logout', authMiddleware.authCaptain, captainController.logoutCaptain)
router.post('/request-deletion',
    authMiddleware.authCaptain,
    body('reason').isString().isLength({ min: 3, max: 500 }),
    captainController.requestDeletion
)


module.exports = router;