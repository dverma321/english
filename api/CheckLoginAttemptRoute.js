const express = require('express');
const router = express.Router();
const LoginAttempt = require('../Model/LoginAttempt.js');
const bcrypt = require('bcrypt'); // For password comparison

const User = require('../Model/User.js');
const checkLoginAttempts = require('../Middleware/checkLoginAttempts.js');

router.post('/login', checkLoginAttempts, async (req, res) => {
    const { email, password } = req.body;
    const ipAddress = req.ip;

    const user = await User.findOne({ email });

    if (!user || !(await bcrypt.compare(password, user.password))) {
        // Log failed attempt
        let attempt = await LoginAttempt.findOne({ ipAddress });

        if (!attempt) {
            attempt = new LoginAttempt({ ipAddress, failedCount: 1, lastAttempt: new Date() });
        } else {
            attempt.failedCount += 1;
            attempt.lastAttempt = new Date();

            // Block the IP if failed attempts exceed limit
            if (attempt.failedCount >= 5) {
                attempt.blockedUntil = new Date(new Date().getTime() + 24 * 60 * 60 * 1000); // Block for 24 hours
            }
        }

        await attempt.save();

        return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Reset attempts on successful login
    await LoginAttempt.deleteOne({ ipAddress });

    // Proceed with login logic (e.g., generate a token)
    res.json({ message: 'Login successful!' });
});

module.exports = router;
