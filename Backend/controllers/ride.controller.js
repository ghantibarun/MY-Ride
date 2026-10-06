const rideService = require('../services/ride.service');
const { validationResult } = require('express-validator');
const mapService = require('../services/maps.service');
const { sendMessageToSocketId, sendMessageToRideRoom } = require('../socket');
const rideModel = require('../models/ride.model');

module.exports.createRide = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { pickup, destination, vehicleType } = req.body;

    try {
        const ride = await rideService.createRide({ user: req.user._id, pickup, destination, vehicleType });

        try {
            const pickupCoordinates = await mapService.getAddressCoordinate(pickup);
            const captainsInRadius = await mapService.getCaptainsInTheRadius(pickupCoordinates.ltd, pickupCoordinates.lng, 2);
            const rideWithUser = await rideModel.findOne({ _id: ride._id }).populate('user');

            captainsInRadius.forEach((captain) => {
                sendMessageToSocketId(captain.socketId, {
                    event: 'new-ride',
                    data: rideWithUser
                });
            });
        } catch (error) {
            console.log('Could not notify captains:', error.message);
        }

        return res.status(201).json(ride);
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: err.message });
    }
};

module.exports.getFare = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { pickup, destination } = req.query;

    try {
        const fare = await rideService.getFare(pickup, destination);
        return res.status(200).json(fare);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

module.exports.confirmRide = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { rideId } = req.body;

    try {
        const ride = await rideService.confirmRide({ rideId, captain: req.captain });

        sendMessageToSocketId(ride.user.socketId, {
            event: 'ride-confirmed',
            data: ride
        });

        return res.status(200).json(ride);
    } catch (err) {
        return res.status(err.statusCode || 500).json({ message: err.message });
    }
};

module.exports.startRide = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { rideId, otp } = req.body;

    try {
        const ride = await rideService.startRide({ rideId, otp, captain: req.captain });

        sendMessageToSocketId(ride.user.socketId, {
            event: 'ride-started',
            data: ride
        });

        return res.status(200).json(ride);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

module.exports.endRide = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { rideId } = req.body;

    try {
        const ride = await rideService.endRide({ rideId, captain: req.captain });

        sendMessageToSocketId(ride.user.socketId, {
            event: 'ride-ended',
            data: ride
        });

        return res.status(200).json(ride);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

module.exports.payRide = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { rideId } = req.body;

    try {
        const ride = await rideService.payForRide({ rideId, user: req.user._id });
        return res.status(200).json(ride);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

module.exports.cancelRide = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { rideId, reason } = req.body;

    try {
        const ride = await rideService.cancelRide({ rideId, user: req.user._id, reason });
        sendMessageToSocketId(ride.user.socketId, {
            event: 'ride-cancelled',
            data: ride
        });
        return res.status(200).json(ride);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

module.exports.reviewRide = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { rideId, rating, review } = req.body;

    try {
        const ride = await rideService.reviewRide({ rideId, user: req.user._id, rating, review });
        return res.status(200).json(ride);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

module.exports.sos = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
        const actor = req.user || req.captain;
        const actorField = req.user ? 'user' : 'captain';
        const ride = await rideModel.findOne({ _id: req.body.rideId, [actorField]: actor._id })
            .populate('user')
            .populate('captain');
        if (!ride) return res.status(404).json({ message: 'Ride not found' });

        const sos = {
            rideId: ride._id,
            triggeredBy: actorField,
            location: {
                ltd: Number(req.body.location?.ltd),
                lng: Number(req.body.location?.lng),
            },
            pickup: ride.pickup,
            destination: ride.destination,
            timestamp: new Date().toISOString(),
        };
        if (!Number.isFinite(sos.location.ltd) || !Number.isFinite(sos.location.lng)) {
            return res.status(400).json({ message: 'Valid live coordinates are required' });
        }
        sendMessageToRideRoom(ride._id, { event: 'ride-sos', data: sos });
        const counterpart = req.user ? ride.captain : ride.user;
        if (counterpart?.socketId) {
            sendMessageToSocketId(counterpart.socketId, { event: 'ride-sos', data: sos });
        }
        return res.status(200).json({ message: 'SOS alert sent', sos });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
