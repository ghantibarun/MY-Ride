const mongoose = require('mongoose');

const rideSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true,
        index: true,
    },
    captain: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'captain',
        index: true,
    },
    pickup: {
        type: String,
        required: true,
    },
    destination: {
        type: String,
        required: true,
    },
    fare: {
        type: Number,
        required: true,
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'ongoing', 'completed', 'cancelled'],
        default: 'pending',
        index: true,
    },
    duration: {
        type: Number,
    },
    distance: {
        type: Number,
    },
    paymentID: {
        type: String,
    },
    orderId: {
        type: String,
    },
    signature: {
        type: String,
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'refunded'],
        default: 'pending'
    },
    paymentMethod: {
        type: String,
        enum: ['cash', 'upi', 'online', 'card'],
        default: 'cash'
    },
    paymentAmount: {
        type: Number,
        default: 0
    },
    paidAt: {
        type: Date
    },
    rating: {
        type: Number,
        min: 1,
        max: 5
    },
    review: {
        type: String
    },
    reviewedAt: {
        type: Date
    },
    cancelledBy: {
        type: String,
        enum: ['user', 'captain', 'system'],
    },
    cancellationReason: {
        type: String
    },
    refundAmount: {
        type: Number,
        default: 0
    },
    refundedAt: {
        type: Date
    },
    otp: {
        type: String,
        select: false,
        required: true,
    },
 }, {
    timestamps: true,
});

module.exports = mongoose.model('ride', rideSchema);