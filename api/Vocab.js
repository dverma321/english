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

router.post("/words/:word", async (req, res) => {
  try {
    const { word } = req.params;
    const updateData = req.body;

    // Ensure hindiMeaning exists to satisfy schema
    if (!updateData.hindiMeaning) {
      updateData.hindiMeaning = "";
    }

    const updatedWord = await Word.findOneAndUpdate(
      { word },
      { $set: updateData },
      { new: true, upsert: true, runValidators: true }
    );

    res.json(updatedWord);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});



module.exports = router;



