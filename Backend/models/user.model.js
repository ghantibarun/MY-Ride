const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');


const userSchema = new mongoose.Schema({
    fullname: {
        firstname: {
            type: String,
            required: true,
            minlength: [ 3, 'First name must be at least 3 characters long' ],
        },
        lastname: {
            type: String,
            minlength: [ 3, 'Last name must be at least 3 characters long' ],
        }
    },
    email: {
        type: String,
        required: true,
        unique: true,
        minlength: [ 5, 'Email must be at least 5 characters long' ],
    },
    phone: {
        type: String,
        unique: true,
        sparse: true,
        index: true,
    },
    phoneVerified: {
        type: Boolean,
        default: false,
    },
    otpHash: {
        type: String,
        select: false,
    },
    otpExpiresAt: {
        type: Date,
        select: false,
    },
    password: {
        type: String,
        required: true,
        select: false,
    },
    socketId: {
        type: String,
    },
    deletionRequested: {
        type: Boolean,
        default: false,
    },
    deletionReason: {
        type: String,
        default: '',
    },
    deletionRequestedAt: {
        type: Date,
        default: null,
    },
});

userSchema.methods.generateAuthToken = function () {
    const secret = process.env.JWT_SECRET || 'my_ride_super_secret_jwt_key_2026';
    const token = jwt.sign({ _id: this._id, role: 'user' }, secret, { expiresIn: '24h' });
    return token;
};

userSchema.methods.comparePassword = async function (password) {
    return await bcrypt.compare(password, this.password);
}

userSchema.statics.hashPassword = async function (password) {
    return await bcrypt.hash(password, 10);
}

const userModel = mongoose.models.user || mongoose.model('user', userSchema);


module.exports = userModel;