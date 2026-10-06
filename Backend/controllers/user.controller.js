const userModel = require('../models/user.model');
const userService = require('../services/user.service');
const { validationResult } = require('express-validator');
const blackListTokenModel = require('../models/blackListToken.model');
const { sendMessageToAdminRoom } = require('../socket');

module.exports.registerUser = async (req, res, next) => {
  try{
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { fullname, email, password, phone } = req.body;

    const isUserAlready = await userModel.findOne({ email });

    if (isUserAlready) {
        return res.status(400).json({ message: 'User already exist' });
    }

    const hashedPassword = await userModel.hashPassword(password);

    const user = await userService.createUser({
        firstname: fullname.firstname,
        lastname: fullname.lastname,
        email,
        password: hashedPassword,
        phone
    });

    const token = user.generateAuthToken();

    res.cookie('token', token);

    res.status(201).json({ token, user });
  }catch (error) {
        // THIS WILL PRINT THE REAL BUG IN YOUR TERMINAL!
        console.error("REGISTRATION CRASHED:", error); 
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
}

module.exports.loginUser = async (req, res, next) => {
  try{
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    const user = await userModel.findOne({ email }).select('+password');

    if (!user) {
        return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
        return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = user.generateAuthToken();

    res.cookie('token', token);

    res.status(200).json({ token, user });
  }catch (error) {
        // THIS WILL PRINT THE REAL BUG IN YOUR TERMINAL!
        console.error("REGISTRATION CRASHED:", error); 
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
}

module.exports.getUserProfile = async (req, res, next) => {

    res.status(200).json(req.user);

}

module.exports.logoutUser = async (req, res, next) => {
    res.clearCookie('token');
    const token = req.cookies.token || req.headers.authorization?.split(' ')[ 1 ];

    await blackListTokenModel.create({ token });

    res.status(200).json({ message: 'Logged out' });

}

module.exports.requestDeletion = async (req, res) => {
  const reason = typeof req.body.reason === 'string' ? req.body.reason.trim() : '';
  if (!reason) return res.status(400).json({ message: 'A deletion reason is required' });

  const user = await userModel.findByIdAndUpdate(req.user._id, {
    deletionRequested: true,
    deletionReason: reason,
    deletionRequestedAt: new Date(),
  }, { new: true }).select('fullname email phone deletionRequested deletionReason deletionRequestedAt');

  sendMessageToAdminRoom({
    event: 'admin-deletion-request',
    data: { accountType: 'user', account: user },
  });
  return res.status(200).json(user);
};