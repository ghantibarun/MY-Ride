const mongoose = require('mongoose');

function connectToDb() {
    const dbUri = process.env.DB_CONNECT;

    if (!dbUri) {
        console.warn('DB_CONNECT is not set. Please create a Backend/.env file with a MongoDB URI.');
        return;
    }

    mongoose.connect(dbUri)
        .then(() => {
            console.log('Connected to DB');
        })
        .catch(err => console.log(err));
}

module.exports = connectToDb;