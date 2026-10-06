const crypto = require('crypto');
const smsService = require('./sms.service');

function normalizePhone(phone) {
    return String(phone || '').replace(/[^\d+]/g, '');
}

async function sendOtp(model, phone) {
    const normalizedPhone = normalizePhone(phone);
    if (!/^\+?[1-9]\d{9,14}$/.test(normalizedPhone)) throw new Error('Invalid phone number');
    const account = await model.findOne({ phone: normalizedPhone });
    if (!account) throw new Error('No account found for this phone number');
    const otp = crypto.randomInt(100000, 1000000).toString();
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
    await model.findByIdAndUpdate(account._id, {
        otpHash,
        otpExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });
    await smsService.sendSms(normalizedPhone, `Your MY Ride verification code is ${otp}. It expires in 5 minutes.`);
}

async function verifyOtp(model, phone, otp) {
    const normalizedPhone = normalizePhone(phone);
    const account = await model.findOne({ phone: normalizedPhone }).select('+otpHash +otpExpiresAt');
    if (!account || !account.otpHash || !account.otpExpiresAt || account.otpExpiresAt < new Date()) {
        throw new Error('OTP is invalid or expired');
    }
    const otpHash = crypto.createHash('sha256').update(String(otp)).digest('hex');
    if (otpHash !== account.otpHash) throw new Error('OTP is invalid or expired');
    account.phoneVerified = true;
    account.otpHash = undefined;
    account.otpExpiresAt = undefined;
    await account.save();
    return account;
}

module.exports = { sendOtp, verifyOtp };
