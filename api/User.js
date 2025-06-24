const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const UserModel = require('../Model/User.js');
const authenticate = require('../Middleware/authenticate.js');

const path = require('path');
const { sendEmail } = require('./Mailer.js');  // Import the email sending function
const crypto = require('crypto'); // For generating random verification tokens

// login route

router.post("/signin", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      status: "FAILED",
      message: "Email and password are required."
    });
  }

  try {
    const user = await UserModel.findOne({ email });
    if (!user) {
      return res.status(401).json({
        status: "FAILED",
        message: "Email is not registered."
      });
    }

    // Check if the user's email is verified
    if (!user.isVerified) {
      return res.status(403).json({
        status: "FAILED",
        message: "Email not verified. Please verify your email before logging in."
      });
    }

    // Compare the provided password with the hashed password in the database
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(403).json({
        status: "FAILED",
        message: "Invalid credentials."
      });
    }

    // Generating Token after login
    const token = await user.generateAuthToken();

    // Storing token in the cookie
    res.cookie("jwtoken", token, {
      expires: new Date(Date.now() + 25892000000),
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
      credentials: 'include'
    });

    res.status(200).json({
      status: "SUCCESS",
      message: "Login successful.",
      token,
      userId: user._id,
      user
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({
      status: "FAILED",
      message: "An error occurred during login."
    });
  }
});

// login with blocking ip address

const LoginAttempt = require('../Model/LoginAttempt.js');

router.post("/signin_loginattempt", async (req, res) => {
  const { email, password } = req.body;
  const ipAddress = req.ip; // Capture the IP address of the client

  if (!email || !password) {
    return res.status(400).json({
      status: "FAILED",
      message: "Email and password are required."
    });
  }

  try {
    // Check if the IP is blocked
    let attempt = await LoginAttempt.findOne({ ipAddress });
    const now = new Date();

    if (attempt) {
      // If the IP is blocked and still within the block period
      if (attempt.blockedUntil && now < attempt.blockedUntil) {
        return res.status(403).json({
          status: "FAILED",
          message: "Too many failed attempts. Try again later."
        });
      }

      // Reset block if the block period has passed
      if (attempt.blockedUntil && now >= attempt.blockedUntil) {
        attempt.failedCount = 0;
        attempt.blockedUntil = null;
        await attempt.save();
      }
    }

    // Check if the email exists in the database
    const user = await UserModel.findOne({ email });
    if (!user) {
      // Increment failed attempts for the IP
      attempt = await incrementFailedAttempts(ipAddress, attempt);

      return res.status(401).json({
        status: "FAILED",
        message: "Email is not registered."
      });
    }

    // Compare the provided password with the hashed password in the database
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      // Increment failed attempts for the IP
      attempt = await incrementFailedAttempts(ipAddress, attempt);

      return res.status(403).json({
        status: "FAILED",
        message: "Invalid credentials."
      });
    }

    // Reset login attempts on successful login
    if (attempt) {
      await LoginAttempt.deleteOne({ ipAddress });
    }

    // Generate a token after login
    const token = await user.generateAuthToken();

    // Store the token in a cookie
    res.cookie("jwtoken", token, {
      expires: new Date(Date.now() + 25892000000),
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
      credentials: 'include'
    });

    res.status(200).json({
      status: "SUCCESS",
      message: "Login successful.",
      token,
      userId: user._id
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({
      status: "FAILED",
      message: "An error occurred during login."
    });
  }
});

// Helper function to increment failed attempts
async function incrementFailedAttempts(ipAddress, attempt) {
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
  return attempt;
}


// Logout route

router.post('/logout', async (req, res) => {
  try {
    // Get token from cookie
    const token = req.cookies.jwtoken;
    if (!token) {
      return res.status(401).json({ status: "FAILED", message: "No token found." });
    }

    // Verify and decode the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Remove all stored tokens for this user (logout from all devices)
    const updateResult = await UserModel.findByIdAndUpdate(decoded._id, { $set: { tokens: [] } });

    // Clear the cookie on the client side
    res.clearCookie('jwtoken', {
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'none'
    });

    console.log("User logged out from all devices successfully...");
    res.json({
      status: "SUCCESS",
      message: "Logged out from all devices successfully."
    });
  } catch (error) {
    console.error("Error during logout:", error);
    res.status(500).json({ status: "FAILED", message: "Logout failed." });
  }
});

// getData route  

router.get("/getData", authenticate, async (req, res) => {
  try {
    // console.log("/getData route has been called");

    const rootUser = req.rootUser;

    res.send(rootUser);
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).send('Something went wrong while fetching data');
  }
});

// new sign up way by only email first then other profile data

router.post('/signup-new', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ status: "400", message: 'Email is required' });
    }

    const allowedDomains = ['gmail.com', 'yahoo.com', 'qq.com', 'tencent.com', 'outlook.com', 'hotmail.com', 'icloud.com', 'aol.com', 'protonmail.com'];
    const emailDomain = email.split('@')[1];

    if (!allowedDomains.includes(emailDomain)) {
      return res.status(400).json({ status: "400", message: 'Only emails from popular domain is allowed' });
    }

    const existingUser = await UserModel.findOne({ email });

    if (existingUser) {
      if (existingUser.isVerified) {
        if (existingUser.isProfileCompleted) {
          return res.status(200).json({
            status: "ALREADY_REGISTERED",
            message: "Email verified and profile completed",
            redirectUrl: "/login"
          });
        } else {
          return res.status(200).json({
            status: "VERIFIED_NOT_COMPLETED",
            message: "Email verified but profile not completed",
            redirectUrl: `/complete-profile?email=${encodeURIComponent(email)}`
          });
        }
      } else {
        // Resend verification link
        const verificationToken = crypto.randomBytes(32).toString('hex');
        existingUser.verificationToken = verificationToken;
        await existingUser.save();
        const verificationLink = `https://english-404y.onrender.com/user/verify-email-new?token=${verificationToken}`;

        await sendEmail(
          process.env.AUTH_MAIL,
          email,
          "Email Verification",
          `<p>Click <a href="${verificationLink}">here</a> to verify your email.</p>`
        );

        return res.status(409).json({
          status: "409",
          message: "Email already exists but not verified"
        });
      }
    }

    // New user creation
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const newUser = new UserModel({
      email,
      isVerified: false,
      isProfileCompleted: false,
      verificationToken
    });

    await newUser.save();

    const verificationLink_site = `https://snowandwhite.onrender.com/user/verify-email-new?token=${verificationToken}`;
    const verificationLink = `https://english-404y.onrender.com/user/verify-email-new?token=${verificationToken}`;

    await sendEmail(
      process.env.AUTH_MAIL,
      email,
      "Email Verification",
      `<p>Click <a href="${verificationLink}">here</a> to verify your email.</p>`
    );

    return res.status(200).json({ status: "200", message: 'Verification email sent' });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: 'FAILED', message: 'Internal server error' });
  }
});


router.get('/verify-email-new', async (req, res) => {
  try {
    const { token } = req.query;

    const user = await UserModel.findOne({ verificationToken: token });

    if (!user) {
      return res.status(400).send("Invalid or expired token");
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save();

    // Redirect to Step 2 (profile completion page)
    // res.redirect(`https://snowandwhite.netlify.app/complete-profile?email=${user.email}`);
    res.redirect(`https://english-404y.onrender.com/complete-profile?email=${user.email}`);

  } catch (error) {
    res.status(500).send("Error verifying email");
  }
});

router.post('/complete-profile', async (req, res) => {
  try {
    const { email, name, password, confirmPassword, profilePassword } = req.body;

    if (!email || !name || !password || !confirmPassword || !profilePassword) {
      return res.status(400).json({ status: "400", message: 'All fields are required' });
    }

    if (password !== confirmPassword) {
      return res.status(403).json({ status: "403", message: 'Passwords do not match' });
    }

    if (password === profilePassword) {
      return res.status(409).json({ status: "409", message: 'Password and Profile password cannot be the same' });
    }

    const user = await UserModel.findOne({ email, isVerified: true });

    if (!user) {
      return res.status(404).json({ status: "404", message: 'User not verified' });
    }

    const salt = 10;
    const hashedPassword = await bcrypt.hash(password, salt);
    const hashedProfilePassword = await bcrypt.hash(profilePassword, salt);

    const adminEmails = ['divyanshuverma36@gmail.com', 'divyanshu8verma@gmail.com', 'vermaenterprises@gmail.com'];

    user.name = name;
    user.password = hashedPassword;
    user.confirmPassword = hashedPassword;
    user.profilePassword = hashedProfilePassword;
    user.isAdmin = adminEmails.includes(email);
    user.isProfileCompleted = true;

    await user.save();

    res.status(200).json({ status: "200", message: "Profile completed successfully" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 'FAILED', message: 'Internal server error' });
  }
});


module.exports = router;


