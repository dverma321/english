const express = require('express');
const router = express.Router();
const sentencesArray = require('../data/Sentences.js');
const authenticate = require("../Middleware/authenticate");
const Translation = require('../Model/TranslateModel.js');
const VocabTranslation = require('../Model/VocabModel.js');

// ✅ GET all sentences for drop-down 

router.get("/all-sentence-data", (req, res) => {
  res.json(sentencesArray);
});

// ✅ Fetch all sentences (with DB + fallback)

router.get("/all-sentences", async (req, res) => {
  try {
    // Flatten all sentences from your static array
    const allSentences = sentencesArray.flatMap(group =>
      group.sentences.map(s => ({
        heading: group.Heading,
        original: typeof s === "string" ? s : s.original, // <-- fix here
        hindi: typeof s === "string" ? "" : s.hindi || ""
      }))
    );


    const uniqueOriginals = [...new Set(allSentences.map(s => s.original))];

    // Fetch stored translations from MongoDB
    const translations = await Translation.find({ original: { $in: uniqueOriginals } }).lean();

    // Map for fast lookup
    const hindiMap = {};
    translations.forEach(doc => {
      hindiMap[doc.original] = doc.hindi || "";
    });

    // Merge DB Hindi (if exists), else fallback to static (if available)
    const finalList = allSentences.map(s => ({
      heading: s.heading,
      original: s.original,
      hindi: hindiMap[s.original] || "" // fallback to empty string if missing
    }));

    res.json({ success: true, data: finalList });
  } catch (err) {
    console.error("Error fetching all sentences:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});


// ✅ POST bulk update translations

router.post("/bulk-update-translations", authenticate, async (req, res) => {
  const { updates } = req.body; // [{ original, lang: "hi", newValue }, ...]

  try {
    updates.forEach(update => {
      sentencesArray.forEach(group => {
        group.sentences.forEach(s => {
          if (s.original === update.original && update.lang === "hi") {
            s.hindi = update.newValue; // Update Hindi value
          }
        });
      });
    });

    res.json({ message: "All sentences updated successfully!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update sentences" });
  }
});


module.exports = router;
