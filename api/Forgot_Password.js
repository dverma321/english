const express = require('express');
const UserModel = require('../Model/User.js');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
require('dotenv').config();


const router = express.Router();



// Forgot password
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await UserModel.findOne({ email });

        if (!user) {
            return res.status(404).json({ Status: 'User Email is not present' });
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
        console.log("Forgot password token is:", token);

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.Auth_mail,
                pass: process.env.Email_pass,
            },
        });

        const encodedToken = encodeURIComponent(token); // Encode the token to avoid URL issues

        const mailOptions = {
            from: process.env.Auth_mail,
            to: email,
            subject: 'Reset your password',
            text: `http://localhost:5173/reset-password/${user._id}/${encodedToken}`, // Replace with your frontend URL
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.log(error);
                return res.status(500).json({ Status: 'Failed to send email' });
            } else {
                console.log('Email sent:', info.response);
                return res.json({ Status: 'Password reset link sent successfully' });
            }
        });
    } catch (err) {
        console.error('Error in forgot password:', err);
        res.status(500).json({ Status: 'Internal server error' });
    }
});

// Reset password route
router.post('/reset-password/:id/:token', async (req, res) => {
    console.log("Received request for resetting password:");

    try {
        const { password } = req.body;
        const { id, token } = req.params;

        // Log incoming values
        console.log("ID received in backend:", id); // Log the received id
        console.log("Token received in backend:", token); // Log the received token
        console.log("Password received in backend:", password); // Log the received password

        console.log("Token received in backend:", token); // Log the received token

        const decodedToken = decodeURIComponent(token); // Decode the token

        // Verify the token
        const decoded = jwt.verify(decodedToken, process.env.JWT_SECRET);

        // Check if the decoded user id matches the one in the params
        if (decoded.id !== id) {
            return res.status(400).json({ Status: 'Invalid token for this user' });
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Update the user's password
        const user = await UserModel.findByIdAndUpdate(id, { password: hashedPassword });

        if (!user) {
            return res.status(404).json({ Status: 'User not found' });
        }

        res.json({ Status: 'Password reset successful' });
    } catch (err) {
        console.error('Error while resetting password:', err);
        res.status(400).json({ Status: 'Invalid or expired token' });
    }
});


module.exports = router;
