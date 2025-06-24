const nodemailer = require('nodemailer');
const EmailLog = require('../Model/Emaillogs.js'); // Import Email Schema
require('dotenv').config(); // Load environment variables from .env file

// Create a transporter
const transporter = nodemailer.createTransport({
    service: 'gmail', // Use your email service (e.g., Gmail, Outlook, etc.)
    auth: {
        user: process.env.Auth_mail, // Your email address from .env
        pass: process.env.Email_pass, // Your email password (or app password if 2FA is enabled)
    },
});


// Function to Send Email & Save to DB
const sendEmail = async (from, to, subject, text, html) => {
    console.log(`Sending email to ${to}`);

    const mailOptions = {
        from,
        to,
        subject,
        text,
        html,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent:', info.response);

        // Save only email, message, and timestamp
        const emailLog = new EmailLog({ email: to, message : text });
        await emailLog.save();
        console.log('Email saved to MongoDB');

        return info;
    } catch (error) {
        console.error('Error sending email:', error);
        throw new Error('Failed to send email');
    }
};

module.exports = { sendEmail };
