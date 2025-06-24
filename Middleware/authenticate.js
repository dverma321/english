const jwt = require('jsonwebtoken');
const User = require('../Model/User');
require('dotenv').config();

const Authenticate = async (req, res, next) => {
  try {
    // Check Authorization header instead of cookies
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      throw new Error('Unauthorized: No Token Provided');
    }

    const verifyToken = jwt.verify(token, process.env.JWT_SECRET);
    const rootUser = await User.findOne({ _id: verifyToken._id, "tokens.token": token });

    if (!rootUser) {
      throw new Error('Unauthorized: User Not Found');
    }

    req.token = token;
    req.rootUser = rootUser;
    req.userID = rootUser._id;

    next();
  } catch (err) {
    console.error('Catch Authentication Error:', err);
    res.status(401).json({ error: err.message });
  }
};

module.exports = Authenticate;
