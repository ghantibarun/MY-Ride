const rideModel = require('../models/ride.model');
const mapService = require('./maps.service');
const crypto = require('crypto');

async function getFare(pickup, destination) {
    if (!pickup || !destination) {
        throw new Error('Pickup and destination are required');
    }

    const distanceTime = await mapService.getDistanceTime(pickup, destination);

    const baseFare = {
        auto: 25,
        car: 50,
        motorcycle: 15
    };

    const perKmRate = {
        auto: 12,
        car: 18,
        motorcycle: 7
    };

    const perMinuteRate = {
        auto: 1.5,
        car: 3,
        motorcycle: 1
    };

    const fare = {
        auto: Math.round(baseFare.auto + ((distanceTime.distance.value / 1000) * perKmRate.auto) + ((distanceTime.duration.value / 60) * perMinuteRate.auto)),
        car: Math.round(baseFare.car + ((distanceTime.distance.value / 1000) * perKmRate.car) + ((distanceTime.duration.value / 60) * perMinuteRate.car)),
        motorcycle: Math.round(baseFare.motorcycle + ((distanceTime.distance.value / 1000) * perKmRate.motorcycle) + ((distanceTime.duration.value / 60) * perMinuteRate.motorcycle))
    };

    return fare;
}

module.exports.getFare = getFare;

function getOtp(num) {
    function generateOtp(num) {
        return crypto.randomInt(Math.pow(10, num - 1), Math.pow(10, num)).toString();
    }
    return generateOtp(num);
}

function calculateRefundAmount({ fare, paymentStatus = 'pending', status = 'pending' }) {
    if (status === 'cancelled' && paymentStatus === 'paid') {
        return Number(fare || 0);
    }
    return 0;
}

module.exports.calculateRefundAmount = calculateRefundAmount;

module.exports.createRide = async ({ user, pickup, destination, vehicleType }) => {
    if (!user || !pickup || !destination || !vehicleType) {
        throw new Error('All fields are required');
    }

    const fare = await getFare(pickup, destination);

    const ride = await rideModel.create({
        user,
        pickup,
        destination,
        otp: getOtp(6),
        fare: fare[vehicleType],
        paymentStatus: 'pending'
    });

    return ride;
};

module.exports.confirmRide = async ({ rideId, captain }) => {
    if (!rideId) {
        throw new Error('Ride id is required');
    }

    const ride = await rideModel.findOneAndUpdate({ _id: rideId }, {
        status: 'accepted',
        captain: captain._id
    }, { new: true }).populate('user').populate('captain').select('+otp');

    if (!ride) {
        throw new Error('Ride not found');
    }

    return ride;
};

module.exports.startRide = async ({ rideId, otp, captain }) => {
    if (!rideId || !otp) {
        throw new Error('Ride id and OTP are required');
    }

    const ride = await rideModel.findOne({ _id: rideId, captain: captain._id }).populate('user').populate('captain').select('+otp');

    if (!ride) {
        throw new Error('Ride not found');
    }

    if (ride.status !== 'accepted') {
        throw new Error('Ride not accepted');
    }

    if (ride.otp !== otp) {
        throw new Error('Invalid OTP');
    }

    const startedRide = await rideModel.findOneAndUpdate({ _id: rideId }, {
        status: 'ongoing'
    }, { new: true }).populate('user').populate('captain').select('+otp');

    return startedRide;
};

module.exports.endRide = async ({ rideId, captain }) => {
    if (!rideId) {
        throw new Error('Ride id is required');
    }

    const ride = await rideModel.findOne({ _id: rideId, captain: captain._id }).populate('user').populate('captain').select('+otp');

    if (!ride) {
        throw new Error('Ride not found');
    }

    if (ride.status !== 'ongoing') {
        throw new Error('Ride not ongoing');
    }

    const endedRide = await rideModel.findOneAndUpdate({ _id: rideId }, {
        status: 'completed'
    }, { new: true }).populate('user').populate('captain').select('+otp');

    return endedRide;
};

module.exports.payForRide = async ({ rideId, user }) => {
    if (!rideId || !user) {
        throw new Error('Ride id and user are required');
    }

    const ride = await rideModel.findOne({ _id: rideId, user }).populate('user').populate('captain').select('+otp');

    if (!ride) {
        throw new Error('Ride not found');
    }

    if (ride.status === 'cancelled') {
        throw new Error('Cannot pay for a cancelled ride');
    }

    if (ride.paymentStatus === 'paid') {
        return ride;
    }

    const paidRide = await rideModel.findOneAndUpdate({ _id: rideId, user }, {
        paymentStatus: 'paid',
        paymentMethod: 'card',
        paymentAmount: ride.fare,
        paidAt: Date.now()
    }, { new: true }).populate('user').populate('captain').select('+otp');

    return paidRide;
};

module.exports.cancelRide = async ({ rideId, user, reason }) => {
    if (!rideId || !user) {
        throw new Error('Ride id and user are required');
    }

    const ride = await rideModel.findOne({ _id: rideId, user }).populate('user').populate('captain').select('+otp');

    if (!ride) {
        throw new Error('Ride not found');
    }

    if (ride.status === 'completed' || ride.status === 'cancelled') {
        throw new Error('Ride cannot be cancelled');
    }

    const refundAmount = calculateRefundAmount({ fare: ride.fare, paymentStatus: ride.paymentStatus, status: 'cancelled' });

    const cancelledRide = await rideModel.findOneAndUpdate({ _id: rideId, user }, {
        status: 'cancelled',
        cancellationReason: reason || 'Cancelled by rider',
        refundAmount,
        refundedAt: refundAmount > 0 ? Date.now() : null,
        paymentStatus: refundAmount > 0 ? 'refunded' : ride.paymentStatus
    }, { new: true }).populate('user').populate('captain').select('+otp');

    return cancelledRide;
};

module.exports.reviewRide = async ({ rideId, user, rating, review }) => {
    if (!rideId || !user) {
        throw new Error('Ride id and user are required');
    }

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        throw new Error('Rating must be between 1 and 5');
    }

    const reviewedRide = await rideModel.findOneAndUpdate({ _id: rideId, user }, {
        rating,
        review: review || '',
        reviewedAt: Date.now()
    }, { new: true }).populate('user').populate('captain').select('+otp');

    if (!reviewedRide) {
        throw new Error('Ride not found');
    }

    return reviewedRide;
};
