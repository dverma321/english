const mongoose = require('mongoose');

const loginAttemptSchema = new mongoose.Schema({
    ipAddress: { type: String, required: true },
    lastAttempt: { type: Date, required: true },
    failedCount: { type: Number, default: 0 },
    blockedUntil: { type: Date, default: null }
});

module.exports = mongoose.model('LoginAttempt', loginAttemptSchema);
