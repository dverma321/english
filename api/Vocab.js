const express = require("express");
const router = express.Router();
const Word = require("../Model/VocabModel.js"); 
const wordList = require("../data/vocab.js"); 

// ✅ Get all words with synonyms + antonyms + hindiMeaning (if exists in DB)

router.get("/words", async (req, res) => {
  try {
    const hindiMeanings = await Word.find(); // all saved Hindi meanings
    const merged = wordList.map((w) => {
      const found = hindiMeanings.find((h) => h.word === w.word);
      return {
        ...w,
        hindiMeaning: found ? found.hindiMeaning : "", // empty if not saved yet
      };
    });
    res.json(merged);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch words" });
  }
});


// ✅ Save or update Hindi meaning for a word
router.post("/words/:word", async (req, res) => {
  try {
    const { hindiMeaning } = req.body;
    const { word } = req.params;

    if (!hindiMeaning) {
      return res.status(400).json({ error: "Hindi meaning is required" });
    }

    const updated = await Word.findOneAndUpdate(
      { word },
      { hindiMeaning },
      { new: true, upsert: true } // create if doesn't exist
    );

    res.json({ message: "Hindi meaning saved", word: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save meaning" });
  }
});

module.exports = router;
