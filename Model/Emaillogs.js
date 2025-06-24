const mongoose = require('mongoose');

const emailSchema = new mongoose.Schema({
    email: { type: String, required: true }, // Recipient email
    message: { type: String, required: true }, // Email message
    timestamp: { type: Date, default: Date.now }, // Auto timestamp
    replies: [
        {
          message: { type: String, required: true },
          timestamp: { type: Date, default: Date.now },
        },
      ],
});

module.exports = mongoose.model('EmailLog', emailSchema);

