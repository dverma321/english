const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String,
    isAdmin: Boolean,
    profilePassword: String,
    isVerified: { type: Boolean, default: false }, // Email verified flag
    isProfileCompleted : { type: Boolean, default: false },
    verificationToken: { type: String, default: null }, // Store verification token
    tokenExpiresAt: { type: Date, default: null }, // Expiry time for token

    createdAt: { type: Date, default: Date.now },

    gems: {
        type: Number,
        default: 1
    },
    lastLogin: { type: Date, default: null },
    lastGemUpdate: {
        type: Date,
        default: null
    },

    tokens: [
        {
            token: {
                type: String,
                required: true
            }
        }       
    ],
    default: [] // ✅ Make sure it's always an array
});

// Generate Auth Token
userSchema.methods.generateAuthToken = async function () {
    try {
        let token = jwt.sign(
            { _id: this._id },
            process.env.JWT_SECRET,
            { expiresIn: "7d" } // Token expires in 7 days
        );

        this.tokens = this.tokens.concat({ token });

        // ✅ Save the updated user with the new token
        await this.save();

        return token;
    } catch (err) {
        console.log("Error Generating Token:", err);
    }
};

const User = mongoose.model('UserData', userSchema);
module.exports = User;
