const axios = require('axios');

async function sendSms(phone, message) {
    const provider = (process.env.SMS_PROVIDER || 'console').toLowerCase();

    if (provider === 'twilio') {
        const auth = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
        await axios.post(
            `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`,
            new URLSearchParams({
                To: phone,
                From: process.env.TWILIO_PHONE_NUMBER,
                Body: message,
            }),
            { headers: { Authorization: `Basic ${auth}` } }
        );
        return;
    }

    if (provider === 'msg91') {
        await axios.post('https://control.msg91.com/api/v5/flow/', {
            template_id: process.env.MSG91_TEMPLATE_ID,
            recipients: [{ mobiles: phone, OTP: message.match(/\d{6}/)?.[0] }],
        }, {
            headers: {
                authkey: process.env.MSG91_AUTH_KEY,
                'Content-Type': 'application/json',
            },
        });
        return;
    }

    console.log(`[SMS DEV FALLBACK] ${phone}: ${message}`);
}

module.exports = { sendSms };
