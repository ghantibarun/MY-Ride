const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    ride: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ride',
        required: true,
        index: true,
    },
    captain: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'captain',
        required: true,
        index: true,
    },
    type: {
        type: String,
        enum: ['commission', 'captain_earning', 'payment', 'refund'],
        required: true,
    },
    method: {
        type: String,
        enum: ['cash', 'upi', 'online', 'card'],
        required: true,
    },
    amount: {
        type: Number,
        required: true,
        min: 0,
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed'],
        default: 'completed',
    },
    reference: {
        type: String,
        unique: true,
        sparse: true,
    },
}, { timestamps: true });

transactionSchema.index({ ride: 1, type: 1 }, { unique: true });

module.exports = mongoose.model('Transaction', transactionSchema);
