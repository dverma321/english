const express = require('express');
const router = express.Router();
const sentencesArray = require('../data/Sentences.js');
const authenticate = require("../Middleware/authenticate");
const Translation = require('../Model/TranslateModel.js');
const VocabTranslation = require('../Model/VocabModel.js');


// Route to fetch paginated and translated sentences automatically except hindi one

router.post('/sentences', async (req, res) => {
    const { clientLang = 'en', page = 1 } = req.body;
    const groupsPerPage = 1;

    try {
        const validGroups = sentencesArray.filter(group => group.Heading);

        const totalPages = Math.ceil(validGroups.length / groupsPerPage);
        const startIdx = (page - 1) * groupsPerPage;
        const endIdx = page * groupsPerPage;
        const paginatedGroups = validGroups.slice(startIdx, endIdx);

        // Sentences Hindi translations
        const allSentences = paginatedGroups.flatMap(group => group.sentences);
        const uniqueSentences = [...new Set(allSentences)];

        const translations = await Translation.find({ original: { $in: uniqueSentences } }).lean();

        const hindiMap = {};
        const clientLangMap = {};

        translations.forEach(doc => {
            hindiMap[doc.original] = doc.hindi?.value || "";
            const clientTranslation = doc.clientLang?.[clientLang]?.approved || "";
            clientLangMap[doc.original] = clientTranslation;
        });

        // Vocab Hindi translations
        const allVocabWords = paginatedGroups.flatMap(group => group.vocab?.map(v => v.word) || []);
        const vocabTranslations = await VocabTranslation.find({ word: { $in: allVocabWords } }).lean();
        const vocabHindiMap = {};
        vocabTranslations.forEach(v => {
            vocabHindiMap[v.word] = v.hindi || "";
        });

        const finalData = paginatedGroups.map(group => {
            const heading = group.Heading;
            const ImageUrl = group.ImageUrl;

            const translationsData = group.sentences.map(sentence => ({
                original: sentence,
                hindi: hindiMap[sentence] || "",
                clientLang: clientLangMap[sentence] || ""
            }));

            const vocabData = (group.vocab || []).map(v => ({
                ...v,
                hindi: vocabHindiMap[v.word] || ""
            }));

            return { heading, ImageUrl, translations: translationsData, vocab: vocabData };
        });

        res.json({
            dateTitle: `Learning Daily Use Sentences - ${new Date().toLocaleDateString()}`,
            currentPage: page,
            totalPages,
            data: finalData
        });

    } catch (err) {
        console.error("Translation error:", err.message);
        res.status(500).json({ error: "Failed to load sentences." });
    }
});


// ✅ Modified Route to update a translation (admin input only for Hindi)

router.post('/update-translation', authenticate, async (req, res) => {
    const { original, lang, newValue } = req.body;

    try {
        let update = {};

        if (lang === 'hi') {
            // Directly store the admin value for Hindi (no "approved" field)
            update = { 'hindi.value': newValue };
        } else {
            // For other dynamic clientLangs, store in "approved" field
            update = { [`clientLang.${lang}.approved`]: newValue };
        }

        await Translation.findOneAndUpdate({ original }, { $set: update }, { upsert: true });

        res.json({ message: 'Translation updated successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update translation' });
    }
});

// ✅ GET all sentences
router.get("/all-sentence-data", (req, res) => {
  res.json(sentencesArray);
});


// Get data by heading (with translations only, no vocab)
router.get("/sentences/:heading", async (req, res) => {
  try {
    const headingParam = decodeURIComponent(req.params.heading).toLowerCase();

    const group = sentencesArray.find(
      (item) => item.Heading.toLowerCase() === headingParam
    );

    if (!group) {
      return res.status(404).json({ message: "Heading not found" });
    }

    // Collect sentences + fetch translations
    const allSentences = group.sentences;
    const translations = await Translation.find({ original: { $in: allSentences } }).lean();

    const hindiMap = {};
    translations.forEach(doc => {
      hindiMap[doc.original] = doc.hindi?.value || "";
    });

    // Build response in same shape as /sentences
    const finalGroup = {
      heading: group.Heading,
      ImageUrl: group.ImageUrl,
      translations: group.sentences.map(sentence => ({
        original: sentence,
        hindi: hindiMap[sentence] || ""
      }))
    };

    res.json(finalGroup);

  } catch (err) {
    console.error("Error fetching heading:", err.message);
    res.status(500).json({ error: "Failed to load heading data." });
  }
});



module.exports = router;
