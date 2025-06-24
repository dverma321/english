const mongoose = require('mongoose');

// Define the Message schema
const messageSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    message: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }, // Store the date when the message was created
});

// Create a model from the schema
const Message = mongoose.model('Message', messageSchema);

module.exports = Message;
