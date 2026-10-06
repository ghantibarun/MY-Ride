const express = require('express');
const router = express.Router();
const { body, query } = require('express-validator');
const rideController = require('../controllers/ride.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.post('/create',
    authMiddleware.authUser,
    body('pickup').isString().isLength({ min: 3 }).withMessage('Invalid pickup address'),
    body('destination').isString().isLength({ min: 3 }).withMessage('Invalid destination address'),
    body('vehicleType').isString().isIn(['auto', 'car', 'motorcycle']).withMessage('Invalid vehicle type'),
    rideController.createRide
);

router.get('/get-fare',
    authMiddleware.authUser,
    query('pickup').isString().isLength({ min: 3 }).withMessage('Invalid pickup address'),
    query('destination').isString().isLength({ min: 3 }).withMessage('Invalid destination address'),
    rideController.getFare
);

router.post('/confirm',
    authMiddleware.authCaptain,
    body('rideId').isMongoId().withMessage('Invalid ride id'),
    rideController.confirmRide
);

router.post('/start-ride',
    authMiddleware.authCaptain,
    body('rideId').isMongoId().withMessage('Invalid ride id'),
    body('otp').isString().isLength({ min: 6, max: 6 }).withMessage('Invalid OTP'),
    rideController.startRide
);

router.post('/end-ride',
    authMiddleware.authCaptain,
    body('rideId').isMongoId().withMessage('Invalid ride id'),
    rideController.endRide
);

router.post('/pay',
    authMiddleware.authUser,
    body('rideId').isMongoId().withMessage('Invalid ride id'),
    rideController.payRide
);

router.post('/cancel',
    authMiddleware.authUser,
    body('rideId').isMongoId().withMessage('Invalid ride id'),
    body('reason').optional().isString(),
    rideController.cancelRide
);

router.post('/review',
    authMiddleware.authUser,
    body('rideId').isMongoId().withMessage('Invalid ride id'),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    body('review').optional().isString(),
    rideController.reviewRide
);

router.post('/sos',
    authMiddleware.authUser,
    body('rideId').isMongoId().withMessage('Invalid ride id'),
    body('location.ltd').isFloat({ min: -90, max: 90 }),
    body('location.lng').isFloat({ min: -180, max: 180 }),
    rideController.sos
);

router.post('/captain-sos',
    authMiddleware.authCaptain,
    body('rideId').isMongoId().withMessage('Invalid ride id'),
    body('location.ltd').isFloat({ min: -90, max: 90 }),
    body('location.lng').isFloat({ min: -180, max: 180 }),
    rideController.sos
);

module.exports = router;