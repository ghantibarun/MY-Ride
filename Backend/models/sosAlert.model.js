const mongoose = require('mongoose');

const sosAlertSchema = new mongoose.Schema({
    ride: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ride',
        required: true,
        index: true,
    },
    triggeredBy: {
        type: String,
        enum: ['user', 'captain'],
        required: true,
    },
    location: {
        ltd: { type: Number, required: true },
        lng: { type: Number, required: true },
    },
    pickup: String,
    destination: String,
    status: {
        type: String,
        enum: ['active', 'resolved'],
        default: 'active',
        index: true,
    },
    triggeredAt: {
        type: Date,
        default: Date.now,
        index: true,
    },
    resolvedAt: Date,
}, { timestamps: true });

module.exports = mongoose.model('SosAlert', sosAlertSchema);
