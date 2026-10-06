const express = require('express');
const { body } = require('express-validator');
const authMiddleware = require('../middlewares/auth.middleware');
const paymentController = require('../controllers/payment.controller');

const router = express.Router();

router.post('/orders',
    authMiddleware.authUser,
    body('rideId').isMongoId().withMessage('Invalid ride id'),
    body('method').optional().isIn(['upi', 'online']).withMessage('Invalid payment method'),
    paymentController.createOrder
);

router.post('/verify',
    authMiddleware.authUser,
    body('rideId').isMongoId().withMessage('Invalid ride id'),
    body('orderId').isString().notEmpty(),
    body('paymentId').isString().notEmpty(),
    body('signature').isString().notEmpty(),
    body('method').optional().isIn(['upi', 'online']),
    paymentController.verify
);

router.post('/webhook', paymentController.webhook);

module.exports = router;
