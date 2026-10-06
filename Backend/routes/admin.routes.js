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
router.patch('/captains/:captainId/kyc',
    param('captainId').isMongoId().withMessage('Invalid captain id'),
    body('kycStatus').isIn(['verified', 'rejected']).withMessage('Invalid KYC status'),
    adminController.updateKyc
);
router.get('/sos', adminController.listSos);
router.patch('/sos/:sosId/resolve',
    param('sosId').isMongoId().withMessage('Invalid SOS id'),
    adminController.resolveSos
);

module.exports = router;
