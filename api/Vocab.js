const express = require("express");
const router = express.Router();
const Word = require("../Model/VocabModel.js"); 
const wordList = require("../data/vocab.js"); 

// ✅ Get all words with synonyms + antonyms + hindiMeaning (if exists in DB)

router.get("/words_old", async (req, res) => {
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

router.get("/words", async (req, res) => {
  try {
    const dbWords = await Word.find();

    // Create a quick lookup object { word: { hindiMeaning, pronounciation } }
    const dbMap = {};
    dbWords.forEach((h) => {
      dbMap[h.word] = {
        hindiMeaning: h.hindiMeaning,
        pronounciation: h.pronounciation
      };
    });

    const merged = wordList.map((w) => ({
      ...w,
      hindiMeaning: dbMap[w.word]?.hindiMeaning || w.hindiMeaning || "",
      pronounciation: dbMap[w.word]?.pronounciation || w.pronounciation || ""
    }));

    res.json(merged);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch words" });
  }
});

// PUT or POST route to update word
router.post("/words/:word", async (req, res) => {
  try {
    const { word } = req.params;
    const updateData = req.body;  // can contain hindiMeaning, pronounciation, synonyms, antonyms

    const updatedWord = await Word.findOneAndUpdate(
      { word },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedWord) {
      return res.status(404).json({ error: "Word not found" });
    }

    res.json(updatedWord);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});


module.exports = router;
