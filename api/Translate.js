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
    // 1️⃣ Flatten all sentences from the static array
    const allSentences = sentencesArray.flatMap(group =>
      group.sentences.map(s => ({
        heading: group.Heading,
        original: typeof s === "string" ? s : s.original,
        hindi: typeof s === "string" ? "" : s.hindi || ""
      }))
    );

    const uniqueOriginals = [...new Set(allSentences.map(s => s.original))];

    // 2️⃣ Fetch all translations that match the originals
    const translations = await Translation.find({ original: { $in: uniqueOriginals } }).lean();

    // 3️⃣ Create a map for quick lookup
    const hindiMap = {};
    translations.forEach(doc => {
      let hindiValue = "";
      if (typeof doc.hindi === "string") {
        hindiValue = doc.hindi.trim();
      } else if (doc.hindi && typeof doc.hindi.value === "string") {
        hindiValue = doc.hindi.value.trim();
      }
      hindiMap[doc.original] = hindiValue;
    });

    // 4️⃣ Merge DB + static Hindi
    const mergedList = allSentences.map(s => ({
      heading: s.heading,
      original: s.original,
      // prefer DB Hindi if exists
      hindi: hindiMap[s.original] || s.hindi || ""
    }));

    // 5️⃣ Filter out any sentence that already has a valid Hindi translation
    const emptySentences = mergedList.filter(
      s => !s.hindi || (typeof s.hindi === "string" && s.hindi.trim() === "")
    );

    // 6️⃣ Include DB-only sentences (those that might exist in DB but not in static array)
    const dbOnlyEmpty = translations
      .filter(doc => {
        let val = "";
        if (typeof doc.hindi === "string") val = doc.hindi.trim();
        else if (doc.hindi && typeof doc.hindi.value === "string") val = doc.hindi.value.trim();
        return !val || val === "";
      })
      .map(doc => ({
        heading: "From Database",
        original: doc.original,
        hindi: ""
      }));

    // 7️⃣ Combine both lists (unique originals only)
    const combined = [...emptySentences, ...dbOnlyEmpty];
    const uniqueCombined = Array.from(
      new Map(combined.map(item => [item.original, item])).values()
    );

    res.json({ success: true, data: uniqueCombined });
  } catch (err) {
    console.error("Error fetching all sentences:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

//  POST bulk update translations

router.post("/bulk-update-translations", authenticate, async (req, res) => {
  const { updates } = req.body; // [{ original, lang: "hi", newValue }, ...]

  try {
    // 1️⃣ Update static array (optional)
    updates.forEach(update => {
      sentencesArray.forEach(group => {
        group.sentences.forEach(s => {
          if (s.original === update.original && update.lang === "hi") {
            s.hindi = update.newValue; // Update Hindi value locally
          }
        });
      });
    });

    // 2️⃣ Prepare bulk operations for MongoDB
    const bulkOps = updates.map(update => ({
      updateOne: {
        filter: { original: update.original },
        update: {
          $set: {
            original: update.original,
            hindi: update.newValue, // store Hindi value in DB
          },
        },
        upsert: true, 
      },
    }));

    // 3️⃣ Perform bulk write in MongoDB
    if (bulkOps.length > 0) {
      await Translation.bulkWrite(bulkOps);
    }

    // 4️⃣ Send response
    res.json({ message: "✅ All sentences updated and saved to database successfully!" });
  } catch (err) {
    console.error("Bulk update failed:", err);
    res.status(500).json({ message: "❌ Failed to update sentences" });
  }
});


module.exports = router;
