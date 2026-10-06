    const captainModel = require('../models/captain.model');


    module.exports.createCaptain = async ({
        firstname, lastname, email, password, color, plate, capacity, vehicleType, phone,
        drivingLicense, rcNumber, insuranceNumber
    }) => {
        if (!firstname || !email || !password || !color || !plate || !capacity || !vehicleType) {
            throw new Error('All fields are required');
        }
        const captain = await captainModel.create({
            fullname: {
                firstname,
                lastname
            },
            email,
            password,
            phone,
            drivingLicense,
            rcNumber,
            insuranceNumber,
            vehicle: {
                color,
                plate,
                capacity,
                vehicleType
            }
        })

        return captain;
    }