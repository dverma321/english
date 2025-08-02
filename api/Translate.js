const express = require('express');
const router = express.Router();
const sentencesArray = require('../data/Sentences.js');
const translateText = require('../Utils/TranslateText.js');
const authenticate = require("../Middleware/authenticate");
const Translation = require('../Model/TranslateModel.js');
const vocabSynonyms = require("../data/vocab.js");


router.post('/sentences', async (req, res) => {
    const { clientLang = 'en', page = 1 } = req.body;
    const groupsPerPage = 1; // show how many group i.e array you want to show on screen

    try {
        // 1. Filter valid groups
        const validGroups = sentencesArray.filter(group => group.Heading);

        const totalPages = Math.ceil(validGroups.length / groupsPerPage);
        const startIdx = (page - 1) * groupsPerPage;
        const endIdx = page * groupsPerPage;
        const paginatedGroups = validGroups.slice(startIdx, endIdx);

        // 2. Flatten all sentences from paginated groups
        const allSentences = paginatedGroups.flatMap(group => group.sentences);

        // 3. Remove duplicates, ensure all are strings
        const uniqueSentences = [...new Set(allSentences.map(s => String(s)))];

        // 4. Fetch Hindi translations from DB
        const translations = await Translation.find({ original: { $in: uniqueSentences } }).lean();
        const hindiMap = {};
        translations.forEach(doc => {
            hindiMap[doc.original] = doc.hindi?.value || "";
        });

        // 5. Translate to clientLang
        const clientTranslations = await translateText(uniqueSentences, clientLang);
        const clientLangMap = {};
        uniqueSentences.forEach((sentence, idx) => {
            clientLangMap[sentence] = clientTranslations[idx];
        });

        // 6. Build final structured response
        const finalData = paginatedGroups.map(group => {
            const heading = group.Heading;
            const ImageUrl = group.ImageUrl;
            const translations = group.sentences.map(sentence => ({
                original: sentence,
                hindi: hindiMap[sentence] || "",
                clientLang: clientLangMap[sentence] || ""
            }));
            return { heading, ImageUrl, translations };
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

// ✅ Modified Route to submit a suggestion (Hindi not allowed)
router.post('/suggest-translation', authenticate, async (req, res) => {
    const { original, lang, suggestion, user } = req.body;

    if (lang === 'hi') {
        return res.status(400).json({ error: 'Suggestions for Hindi are not allowed. Hindi is admin-managed only.' });
    }

    const field = `clientLang.${lang}.suggestions`;

    try {
        await Translation.updateOne(
            { original },
            { $push: { [field]: { value: suggestion, suggestedBy: user } } },
            { upsert: true }
        );

        res.json({ message: 'Suggestion submitted for review' });
    } catch (err) {
        res.status(500).json({ error: 'Suggestion failed' });
    }
});

// all data

router.get('/sentences/all', async (req, res) => {
    const { page = 1 } = req.query;
    const groupsPerPage = 10; // Show 10 groups per page

    try {
        // Filter valid groups with headings
        const validGroups = sentencesArray.filter(group => group.Heading);

        // Pagination logic
        const totalPages = Math.ceil(validGroups.length / groupsPerPage);
        const startIdx = (page - 1) * groupsPerPage;
        const endIdx = page * groupsPerPage;
        const paginatedGroups = validGroups.slice(startIdx, endIdx);

        // Return paginated groups directly
        res.json({
            dateTitle: `Daily Sentences - ${new Date().toLocaleDateString()}`,
            currentPage: page,
            totalPages,
            data: paginatedGroups
        });

    } catch (err) {
        console.error("Error loading sentences:", err.message);
        res.status(500).json({ error: "Failed to load sentences." });
    }
});

// handling images in the table only

router.get('/sentences/all/images', async (req, res) => {
    const { page = 1 } = req.query;
    const groupsPerPage = 1; // Show 1 groups per page

    try {
        // Filter valid groups with headings
        const validGroups = sentencesArray.filter(group => group.Heading);

        // Pagination logic
        const totalPages = Math.ceil(validGroups.length / groupsPerPage);
        const startIdx = (page - 1) * groupsPerPage;
        const endIdx = page * groupsPerPage;
        const paginatedGroups = validGroups.slice(startIdx, endIdx);

        // Return paginated groups directly
        res.json({
            dateTitle: `Daily Sentences - ${new Date().toLocaleDateString()}`,
            currentPage: page,
            totalPages,
            data: paginatedGroups
        });

    } catch (err) {
        console.error("Error loading sentences:", err.message);
        res.status(500).json({ error: "Failed to load sentences." });
    }
});

// vocab list

router.get("/vocab", (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;

  const paginatedData = vocabSynonyms.slice(startIndex, endIndex);

  res.json({
    success: true,
    data: paginatedData,
    total: vocabSynonyms.length,
    currentPage: page,
    totalPages: Math.ceil(vocabSynonyms.length / limit),
  });
});


module.exports = router;
