const { validationResult } = require('express-validator');
const paymentService = require('../services/payment.service');

module.exports.createOrder = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    try {
        const result = await paymentService.createOrder({
            rideId: req.body.rideId,
            userId: req.user._id,
            method: req.body.method,
        });
        return res.status(201).json(result);
    } catch (error) {
        return res.status(error.statusCode || 500).json({ message: error.message });
    }
};

module.exports.verify = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    try {
        const ride = await paymentService.markPaymentCaptured({
            ...req.body,
            userId: req.user._id,
        });
        return res.status(200).json(ride);
    } catch (error) {
        return res.status(error.statusCode || 500).json({ message: error.message });
    }
};

module.exports.webhook = async (req, res) => {
    const signature = req.get('x-razorpay-signature');
    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body));
    const valid = await paymentService.verifyWebhookSignature(rawBody, signature);
    if (!valid) return res.status(400).json({ message: 'Invalid webhook signature' });
    return res.status(200).json({ received: true });
};
