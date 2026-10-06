const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const userModel = require('../models/user.model');
const captainModel = require('../models/captain.model');
const rideModel = require('../models/ride.model');
const transactionModel = require('../models/transaction.model');
const sosAlertModel = require('../models/sosAlert.model');
const mapService = require('../services/maps.service');
const { sendMessageToSocketId, sendMessageToAdminRoom } = require('../socket');

const adminEmail = () => process.env.ADMIN_EMAIL || 'admin@myride.local';
const adminPassword = () => process.env.ADMIN_PASSWORD || 'Barun123';
const adminSecret = () => process.env.ADMIN_SECRET_KEY || 'Barun123';

module.exports.login = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password } = req.body;
    if (email !== adminEmail() || password !== adminPassword()) {
        return res.status(401).json({ message: 'Invalid admin credentials' });
    }

    const token = jwt.sign({ role: 'admin', email: adminEmail() }, adminSecret(), { expiresIn: '8h' });
    return res.status(200).json({ token, admin: { email: adminEmail() } });
};

module.exports.stats = async (req, res) => {
    try {
        const [totalUsers, totalCaptains, captainKyc, activeRides, completedRides, commission] = await Promise.all([
            userModel.countDocuments(),
            captainModel.countDocuments(),
            captainModel.aggregate([{ $group: { _id: '$kycStatus', count: { $sum: 1 } } }]),
            rideModel.countDocuments({ status: { $in: ['pending', 'accepted', 'ongoing'] } }),
            rideModel.countDocuments({ status: 'completed' }),
            transactionModel.aggregate([
                { $match: { type: 'commission', status: 'completed' } },
                { $group: { _id: null, total: { $sum: '$amount' } } },
            ]),
        ]);

        const kyc = captainKyc.reduce((result, item) => {
            result[item._id || 'pending'] = item.count;
            return result;
        }, { pending: 0, verified: 0, rejected: 0 });

        return res.status(200).json({
            totalUsers,
            totalCaptains,
            captainsByKycStatus: kyc,
            activeRides,
            completedRides,
            totalPlatformCommission: commission[0]?.total || 0,
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

module.exports.listCaptains = async (req, res) => {
    const allowedStatuses = ['pending', 'verified', 'rejected'];
    const filter = allowedStatuses.includes(req.query.kycStatus)
        ? { kycStatus: req.query.kycStatus }
        : {};

    try {
        const captains = await captainModel.find(filter)
            .select('fullname phone email vehicle drivingLicense rcNumber insuranceNumber kycStatus walletBalance isBlocked blockReason deletionRequested deletionReason deletionRequestedAt socketId')
            .sort({ createdAt: -1 });
        return res.status(200).json(captains);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

module.exports.listUsers = async (req, res) => {
    const filter = req.query.deletionRequested === 'true' ? { deletionRequested: true } : {};
    try {
        const users = await userModel.find(filter)
            .select('fullname email phone deletionRequested deletionReason deletionRequestedAt')
            .sort({ createdAt: -1 });
        return res.status(200).json(users);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

module.exports.blockCaptain = async (req, res) => {
    const { isBlocked, blockReason = '' } = req.body;
    if (typeof isBlocked !== 'boolean') {
        return res.status(400).json({ message: 'isBlocked must be a boolean' });
    }
    try {
        const captain = await captainModel.findByIdAndUpdate(req.params.captainId, {
            isBlocked,
            blockReason: isBlocked ? String(blockReason).trim() : '',
            ...(isBlocked ? { status: 'inactive' } : {}),
        }, { new: true }).select('fullname phone email vehicle kycStatus walletBalance isBlocked blockReason deletionRequested deletionReason deletionRequestedAt socketId');
        if (!captain) return res.status(404).json({ message: 'Captain not found' });

        if (isBlocked) await mapService.removeCaptainLocation(captain._id);
        if (captain.socketId) {
            sendMessageToSocketId(captain.socketId, {
                event: isBlocked ? 'captain-blocked' : 'captain-unblocked',
                data: { captainId: captain._id, blockReason: captain.blockReason },
            });
        }
        return res.status(200).json(captain);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

module.exports.deleteUser = async (req, res) => {
    try {
        const user = await userModel.findById(req.params.userId).select('socketId');
        if (!user) return res.status(404).json({ message: 'User not found' });
        await rideModel.updateMany(
            { user: user._id, status: { $in: ['pending', 'accepted'] } },
            { status: 'cancelled', cancellationReason: 'User account deleted', cancelledBy: 'system' }
        );
        await userModel.deleteOne({ _id: user._id });
        if (user.socketId) sendMessageToSocketId(user.socketId, { event: 'account-deleted', data: { accountType: 'user' } });
        sendMessageToAdminRoom({ event: 'admin-account-deleted', data: { accountType: 'user', accountId: user._id } });
        return res.status(200).json({ message: 'User account deleted' });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

module.exports.deleteCaptain = async (req, res) => {
    try {
        const captain = await captainModel.findById(req.params.captainId).select('socketId');
        if (!captain) return res.status(404).json({ message: 'Captain not found' });
        await rideModel.updateMany(
            { captain: captain._id, status: { $in: ['pending', 'accepted'] } },
            { status: 'cancelled', cancellationReason: 'Captain account deleted', cancelledBy: 'system' }
        );
        await mapService.removeCaptainLocation(captain._id);
        await captainModel.deleteOne({ _id: captain._id });
        if (captain.socketId) sendMessageToSocketId(captain.socketId, { event: 'account-deleted', data: { accountType: 'captain' } });
        sendMessageToAdminRoom({ event: 'admin-account-deleted', data: { accountType: 'captain', accountId: captain._id } });
        return res.status(200).json({ message: 'Captain account deleted' });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

module.exports.updateKyc = async (req, res) => {
    const { kycStatus } = req.body;
    if (!['verified', 'rejected'].includes(kycStatus)) {
        return res.status(400).json({ message: 'KYC status must be verified or rejected' });
    }

    try {
        const captain = await captainModel.findByIdAndUpdate(
            req.params.captainId,
            { kycStatus },
            { new: true }
        ).select('fullname phone email vehicle drivingLicense rcNumber insuranceNumber kycStatus walletBalance socketId');

        if (!captain) return res.status(404).json({ message: 'Captain not found' });
        if (captain.socketId) {
            sendMessageToSocketId(captain.socketId, {
                event: 'kyc-status-changed',
                data: { captainId: captain._id, kycStatus },
            });
        }
        return res.status(200).json(captain);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

module.exports.listSos = async (req, res) => {
    try {
        const alerts = await sosAlertModel.find()
            .populate('ride', 'pickup destination fare status user captain')
            .populate({ path: 'ride', populate: [{ path: 'user', select: 'fullname phone' }, { path: 'captain', select: 'fullname phone' }] })
            .sort({ triggeredAt: -1 })
            .limit(100);
        return res.status(200).json(alerts);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

module.exports.resolveSos = async (req, res) => {
    try {
        const alert = await sosAlertModel.findByIdAndUpdate(
            req.params.sosId,
            { status: 'resolved', resolvedAt: new Date() },
            { new: true }
        );
        if (!alert) return res.status(404).json({ message: 'SOS alert not found' });
        return res.status(200).json(alert);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
