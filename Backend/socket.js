const socketIo = require('socket.io');
const userModel = require('./models/user.model');
const captainModel = require('./models/captain.model');
const mapService = require('./services/maps.service');
const Redis = require('ioredis');
const { createAdapter } = require('@socket.io/redis-adapter');
const jwt = require('jsonwebtoken');

let io;

function initializeSocket(server) {
    io = socketIo(server, {
        cors: {
            origin: '*',
            methods: [ 'GET', 'POST' ]
        }
    });

    if (process.env.REDIS_URL) {
        const pubClient = new Redis(process.env.REDIS_URL, {
            lazyConnect: true,
            maxRetriesPerRequest: 1,
        });
        const subClient = pubClient.duplicate();

        Promise.all([pubClient.connect(), subClient.connect()])
            .then(() => io.adapter(createAdapter(pubClient, subClient)))
            .catch((error) => console.error('Socket Redis adapter error:', error.message));
        pubClient.on('error', (error) => console.error('Socket Redis publisher error:', error.message));
        subClient.on('error', (error) => console.error('Socket Redis subscriber error:', error.message));
    }

    io.on('connection', (socket) => {
        console.log(`Client connected: ${socket.id}`);

        socket.on('heartbeat', (ack) => {
            if (typeof ack === 'function') {
                ack({ ok: true, timestamp: Date.now() });
            }
        });

        socket.on('join', async (data) => {
            const { userId, userType } = data;

            if (userType === 'user') {
                await userModel.findByIdAndUpdate(userId, { socketId: socket.id });
            } else if (userType === 'captain') {
                const captain = await captainModel.findById(userId).select('kycStatus');
                if (!captain || captain.kycStatus !== 'verified') {
                    return socket.emit('captain-not-eligible', {
                        message: 'Captain KYC verification is required before receiving ride requests.',
                    });
                }
                await captainModel.findByIdAndUpdate(userId, { socketId: socket.id });
            }
        });

        socket.on('join-ride', ({ rideId }) => {
            if (rideId) {
                socket.join(`ride:${rideId}`);
            }
        });

        socket.on('join-admin', ({ token } = {}) => {
            try {
                const decoded = jwt.verify(token, process.env.ADMIN_SECRET_KEY || 'local-admin-secret');
                if (decoded.role !== 'admin') throw new Error('Invalid admin role');
                socket.join('admin-room');
                socket.emit('admin-room-joined');
            } catch (error) {
                socket.emit('admin-auth-error', { message: 'Admin authentication failed' });
            }
        });


        socket.on('update-location-captain', async (data) => {
            const { userId, location } = data;

            if (!userId || !location || !Number.isFinite(Number(location.ltd)) || !Number.isFinite(Number(location.lng))) {
                return socket.emit('error', { message: 'Invalid location data' });
            }

            await captainModel.findByIdAndUpdate(userId, {
                location: {
                    ltd: Number(location.ltd),
                    lng: Number(location.lng),
                },
                locationGeo: {
                    type: 'Point',
                    coordinates: [Number(location.lng), Number(location.ltd)],
                },
            });
            await mapService.updateCaptainLocation(userId, Number(location.ltd), Number(location.lng));
        });

        socket.on('disconnect', () => {
            console.log(`Client disconnected: ${socket.id}`);
        });
    });
}

const sendMessageToSocketId = (socketId, messageObject) => {
    if (io) {
        io.to(socketId).emit(messageObject.event, messageObject.data);
    } else {
        console.log('Socket.io not initialized.');
    }
}

const sendMessageToRideRoom = (rideId, messageObject) => {
    if (io && rideId) {
        io.to(`ride:${rideId}`).emit(messageObject.event, messageObject.data);
    }
};

const sendMessageToAdminRoom = (messageObject) => {
    if (io) {
        io.to('admin-room').emit(messageObject.event, messageObject.data);
    }
};

module.exports = {
    initializeSocket,
    sendMessageToSocketId,
    sendMessageToRideRoom,
    sendMessageToAdminRoom,
};