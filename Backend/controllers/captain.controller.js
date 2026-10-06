const captainModel = require('../models/captain.model');
const captainService = require('../services/captain.service');
const blackListTokenModel = require('../models/blackListToken.model');
const { validationResult } = require('express-validator');
const { sendMessageToAdminRoom } = require('../socket');


module.exports.registerCaptain = async (req, res, next) => {
  try{
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { fullname, email, password, vehicle, phone, drivingLicense, rcNumber, insuranceNumber } = req.body;

    const isCaptainAlreadyExist = await captainModel.findOne({ email });

    if (isCaptainAlreadyExist) {
        return res.status(400).json({ message: 'Captain already exist' });
    }


    const hashedPassword = await captainModel.hashPassword(password);

    const captain = await captainService.createCaptain({
        firstname: fullname.firstname,
        lastname: fullname.lastname,
        email,
        password: hashedPassword,
        color: vehicle.color,
        plate: vehicle.plate,
        capacity: vehicle.capacity,
        vehicleType: vehicle.vehicleType,
        phone,
        drivingLicense,
        rcNumber,
        insuranceNumber
    });

    const token = captain.generateAuthToken();

    res.cookie('token', token);

    res.status(201).json({ token, captain });
  }catch (error) {
        // THIS WILL PRINT THE REAL BUG IN YOUR TERMINAL!
        console.error("REGISTRATION CRASHED:", error); 
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
}

module.exports.loginCaptain = async (req, res, next) => {
  try{
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    const captain = await captainModel.findOne({ email }).select('+password');

    if (!captain) {
        return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (captain.isBlocked) {
        return res.status(403).json({
            message: `Your Captain account has been blocked by Admin: ${captain.blockReason || 'Policy violation'}`,
            isBlocked: true,
        });
    }

    const isMatch = await captain.comparePassword(password);

    if (!isMatch) {
        return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = captain.generateAuthToken();

    res.cookie('token', token);

    res.status(200).json({ token, captain });
  }catch (error) {
        // THIS WILL PRINT THE REAL BUG IN YOUR TERMINAL!
        console.error("REGISTRATION CRASHED:", error); 
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
}

module.exports.getCaptainProfile = async (req, res, next) => {
    res.status(200).json({ captain: req.captain });
}

module.exports.logoutCaptain = async (req, res, next) => {
    const token = req.cookies.token || req.headers.authorization?.split(' ')[ 1 ];

    await blackListTokenModel.create({ token });

    res.clearCookie('token');

    res.status(200).json({ message: 'Logout successfully' });
}

module.exports.requestDeletion = async (req, res) => {
    const reason = typeof req.body.reason === 'string' ? req.body.reason.trim() : '';
    if (!reason) return res.status(400).json({ message: 'A deletion reason is required' });

    const captain = await captainModel.findByIdAndUpdate(req.captain._id, {
        deletionRequested: true,
        deletionReason: reason,
        deletionRequestedAt: new Date(),
    }, { new: true }).select('fullname email phone deletionRequested deletionReason deletionRequestedAt');

    sendMessageToAdminRoom({
        event: 'admin-deletion-request',
        data: { accountType: 'captain', account: captain },
    });
    return res.status(200).json(captain);
};