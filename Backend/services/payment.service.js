const crypto = require('crypto');
const Razorpay = require('razorpay');
const rideModel = require('../models/ride.model');

const razorpay = process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
    ? new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
    })
    : null;

function requireRazorpay() {
    if (!razorpay) {
        const error = new Error('Online payments are not configured');
        error.statusCode = 503;
        throw error;
    }
}

async function createOrder({ rideId, userId, method = 'online' }) {
    const ride = await rideModel.findOne({ _id: rideId, user: userId });
    if (!ride) throw new Error('Ride not found');
    if (ride.status === 'cancelled') throw new Error('Cannot pay for a cancelled ride');
    if (ride.paymentStatus === 'paid') return { ride, order: null };

    if (method === 'cash') {
        return {
            ride: await rideModel.findByIdAndUpdate(rideId, { paymentMethod: 'cash' }, { new: true }),
            order: null,
        };
    }

    requireRazorpay();
    const order = await razorpay.orders.create({
        amount: Math.round(ride.fare * 100),
        currency: 'INR',
        receipt: `ride_${ride._id}`,
        notes: { rideId: String(ride._id), userId: String(userId) },
    });
    await rideModel.findByIdAndUpdate(rideId, {
        orderId: order.id,
        paymentMethod: method,
    });
    return { ride, order };
}

function verifyPaymentSignature({ orderId, paymentId, signature }) {
    requireRazorpay();
    const expected = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');
    if (!signature || signature.length !== expected.length) return false;
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

async function markPaymentCaptured({ rideId, userId, orderId, paymentId, signature, method = 'online' }) {
    const valid = verifyPaymentSignature({ orderId, paymentId, signature });
    if (!valid) {
        const error = new Error('Invalid payment signature');
        error.statusCode = 400;
        throw error;
    }
    const ride = await rideModel.findOneAndUpdate(
        { _id: rideId, user: userId, orderId, paymentStatus: { $ne: 'paid' } },
        {
            paymentStatus: 'paid',
            paymentMethod: method,
            paymentID: paymentId,
            signature,
            paymentAmount: 0,
            paidAt: new Date(),
        },
        { new: true }
    ).populate('user').populate('captain').select('+otp');
    if (!ride) throw new Error('Ride not found or already paid');
    ride.paymentAmount = ride.fare;
    await ride.save();
    return ride;
}

async function verifyWebhookSignature(rawBody, signature) {
    if (!process.env.RAZORPAY_WEBHOOK_SECRET || !signature) return false;
    const expected = crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
        .update(rawBody)
        .digest('hex');
    if (signature.length !== expected.length) return false;
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

module.exports = {
    createOrder,
    markPaymentCaptured,
    verifyWebhookSignature,
};
