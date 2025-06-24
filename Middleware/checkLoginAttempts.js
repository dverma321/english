const LoginAttempt = require('../Model/LoginAttempt');

async function checkLoginAttempts(req, res, next) {
    const ipAddress = req.ip;

    const attempt = await LoginAttempt.findOne({ ipAddress });

    if (attempt) {
        const now = new Date();

        // If the IP is blocked and still within the block period
        if (attempt.blockedUntil && now < attempt.blockedUntil) {
            return res.status(403).json({ message: 'Too many failed attempts. Try again later.' });
        }

        // Reset block if the time has passed
        if (attempt.blockedUntil && now >= attempt.blockedUntil) {
            attempt.failedCount = 0;
            attempt.blockedUntil = null;
            await attempt.save();
        }
    }

    next();
}

module.exports = checkLoginAttempts;
