const express = require('express');
const router = express.Router();
const sentencesArray = require('../data/Vocab.js');
const translateText = require('../Utils/TranslateText.js');
const authenticate = require("../Middleware/authenticate");

// Public route to get all vocabulary
router.get("/get-all-vocabs", (req, res) => {
  res.status(200).json(sentencesArray);
});


module.exports = router;