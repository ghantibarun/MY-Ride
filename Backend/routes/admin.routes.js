const express = require('express');
const { body, param, query } = require('express-validator');
const adminController = require('../controllers/admin.controller');
const authMiddleware = require('../middlewares/auth.middleware');

const router = express.Router();

router.post('/login',
    body('email').isEmail().withMessage('Invalid admin email'),
    body('password').isString().isLength({ min: 1 }).withMessage('Password is required'),
    adminController.login
);

router.use(authMiddleware.authAdmin);
router.get('/stats', adminController.stats);
router.get('/captains',
    query('kycStatus').optional().isIn(['pending', 'verified', 'rejected']),
    adminController.listCaptains
);
router.get('/users',
    query('deletionRequested').optional().isBoolean(),
    adminController.listUsers
);
router.patch('/captains/:captainId/kyc',
    param('captainId').isMongoId().withMessage('Invalid captain id'),
    body('kycStatus').isIn(['verified', 'rejected']).withMessage('Invalid KYC status'),
    adminController.updateKyc
);
router.patch('/captains/:captainId/block',
    param('captainId').isMongoId().withMessage('Invalid captain id'),
    body('isBlocked').isBoolean(),
    body('blockReason').optional().isString().isLength({ max: 500 }),
    adminController.blockCaptain
);
router.delete('/users/:userId',
    param('userId').isMongoId().withMessage('Invalid user id'),
    adminController.deleteUser
);
router.delete('/captains/:captainId',
    param('captainId').isMongoId().withMessage('Invalid captain id'),
    adminController.deleteCaptain
);
router.get('/sos', adminController.listSos);
router.patch('/sos/:sosId/resolve',
    param('sosId').isMongoId().withMessage('Invalid SOS id'),
    adminController.resolveSos
);

module.exports = router;
