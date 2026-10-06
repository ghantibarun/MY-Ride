const test = require('node:test');
const assert = require('node:assert/strict');
const rideService = require('../services/ride.service');

test('refund amount is returned for paid cancelled rides', () => {
    const refund = rideService.calculateRefundAmount({ fare: 120, paymentStatus: 'paid', status: 'cancelled' });
    assert.equal(refund, 120);
});

test('refund amount stays zero for unpaid cancelled rides', () => {
    const refund = rideService.calculateRefundAmount({ fare: 120, paymentStatus: 'pending', status: 'cancelled' });
    assert.equal(refund, 0);
});
