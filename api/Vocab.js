const express = require("express");
const router = express.Router();
const Word = require("../Model/VocabModel.js");
const wordList = require("../data/vocab.js");

// ✅ Get all words with synonyms + antonyms + hindiMeaning (if exists in DB)

router.get("/words", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;

    const total = wordList.length; // count from master list
    const paginatedWordList = wordList.slice(skip, skip + limit);

    // Fetch only those words from DB
    const wordsToFetch = paginatedWordList.map(w => w.word);
    const dbWords = await Word.find({ word: { $in: wordsToFetch } });

    // Build map
    const dbMap = {};
    dbWords.forEach((h) => {
      dbMap[h.word] = {
        hindiMeaning: h.hindiMeaning,
        pronounciation: h.pronounciation,
        synonyms: h.synonyms,
        antonyms: h.antonyms
      };
    });

    // Merge with master wordList
    const merged = paginatedWordList.map((w) => ({
      ...w,
      hindiMeaning: dbMap[w.word]?.hindiMeaning || w.hindiMeaning || "",
      pronounciation: dbMap[w.word]?.pronounciation || w.pronounciation || "",
      synonyms: dbMap[w.word]?.synonyms?.length ? dbMap[w.word].synonyms : w.synonyms || [],
      antonyms: dbMap[w.word]?.antonyms?.length ? dbMap[w.word].antonyms : w.antonyms || []
    }));

    res.json({
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      words: merged,
    });
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

// ✅ Search vocab across full wordList + DB
router.get("/search", async (req, res) => {
  try {
    const term = (req.query.q || "").toLowerCase();
    if (!term) {
      return res.json([]); // no query, return empty
    }

    // 1. Fetch all DB words
    const dbWords = await Word.find();

    // 2. Build DB lookup
    const dbMap = {};
    dbWords.forEach((h) => {
      dbMap[h.word] = {
        hindiMeaning: h.hindiMeaning,
        pronounciation: h.pronounciation,
        synonyms: h.synonyms,
        antonyms: h.antonyms,
      };
    });

    // 3. Merge master + db
    const merged = wordList.map((w) => ({
      ...w,
      hindiMeaning: dbMap[w.word]?.hindiMeaning || w.hindiMeaning || "",
      pronounciation:
        dbMap[w.word]?.pronounciation || w.pronounciation || "",
      synonyms: dbMap[w.word]?.synonyms?.length
        ? dbMap[w.word].synonyms
        : w.synonyms || [],
      antonyms: dbMap[w.word]?.antonyms?.length
        ? dbMap[w.word].antonyms
        : w.antonyms || [],
    }));

    // 4. Filter by search term
    const results = merged.filter(
      (w) =>
        w.word.toLowerCase().includes(term) ||
        w.synonyms.some((s) => s.toLowerCase().includes(term)) ||
        w.antonyms.some((a) => a.toLowerCase().includes(term)) ||
        (w.hindiMeaning && w.hindiMeaning.toLowerCase().includes(term))
    );

    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Search failed" });
  }
});


module.exports = router;
