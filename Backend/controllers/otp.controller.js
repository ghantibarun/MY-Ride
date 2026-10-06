const { validationResult } = require('express-validator');
const otpService = require('../services/otp.service');
const userModel = require('../models/user.model');
const captainModel = require('../models/captain.model');

function controllerFor(model, role) {
    return {
        send: async (req, res) => {
            const errors = validationResult(req);
            if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
            try {
                await otpService.sendOtp(model, req.body.phone);
                return res.status(200).json({ message: `OTP sent to ${role}` });
            } catch (error) {
                return res.status(400).json({ message: error.message });
            }
        },
        verify: async (req, res) => {
            const errors = validationResult(req);
            if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
            try {
                const account = await otpService.verifyOtp(model, req.body.phone, req.body.otp);
                const token = account.generateAuthToken();
                return res.status(200).json({ token, [role]: account });
            } catch (error) {
                return res.status(400).json({ message: error.message });
            }
        },
    };
}

module.exports = {
    user: controllerFor(userModel, 'user'),
    captain: controllerFor(captainModel, 'captain'),
};
