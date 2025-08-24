const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const http = require('http');

// require('./model/Order_dummy_data.js'); // manually inserting data


require('./database/Mongoose.js'); // connecting Mongodb database

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
const vocab_api = require("./api/Vocab.js");

app.use('/user', userRouter);
app.use('/forget', forgetpassword);
app.use('/contact', contactus_route);
app.use('/checklogin', LoginAttempt_route);
app.use('/language', lang_translate);
app.use('/vocab', vocab_api);


app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Internal Server Error');
});

// Create an HTTP server using the Express app
const server = http.createServer(app); // Create the server

server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
