const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const http = require('http');
const path = require('path'); // <-- Add this

require('./database/Mongoose.js');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors({
    origin: 'https://englishdaily.netlify.app',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    optionsSuccessStatus: 204
}));

app.use(express.json());
app.use(cookieParser());

const userRouter = require('./api/User');
const forgetpassword = require('./api/Forgot_Password.js');
const contactus_route = require('./api/ContactUs.js');
const LoginAttempt_route = require('./api/CheckLoginAttemptRoute.js');
const lang_translate = require("./api/Translate.js");

app.use('/user', userRouter);
app.use('/forget', forgetpassword);
app.use('/contact', contactus_route);
app.use('/checklogin', LoginAttempt_route);
app.use('/language', lang_translate);

// Serve frontend (React) static files
app.use(express.static(path.join(__dirname, 'client/build')));

// Fallback to React for other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Internal Server Error');
});

const server = http.createServer(app);
server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
