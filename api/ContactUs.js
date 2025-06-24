const express = require('express');
const Account = require('../Model/ContactUs.js'); // Model for storing messages in the database
const { sendEmail } = require('../api/Mailer.js'); // Import the sendEmail function from mailer.js

const router = express.Router();

// POST endpoint for the contact form
router.post('/messages', async (req, res) => {
    const { name, email, message } = req.body;
    console.log(name, email, message);
    

    // Save the message in the database
    const newMessage = new Account({
        name,
        email,
        message,
    });

    try {
        // Save the message to the database
        await newMessage.save();

        // Prepare the email to be sent to the customer
        const customerSubject = 'Thank you for contacting us!';
        const customerHtml = `<p>Dear <strong>${name}</strong>,</p>
                              <p>Thank you for reaching out to us. We have received your message and will get back to you soon.</p>
                              <p><strong>Your Message:</strong><br/>${message}</p>
                              <p>Best regards,<br/>Your Company</p>`;

        // Send confirmation email to the customer

        await sendEmail(process.env.Auth_mail, email, customerSubject, message, customerHtml);

        // Respond with success
        res.status(200).json({ message: 'Message sent successfully!' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Failed to send message.' });
    }
});

module.exports = router;
