const express = require('express');
const router = express.Router();
const sentencesArray = require('../data/Sentences.js');
const translateText = require('../Utils/TranslateText.js');
const authenticate = require("../Middleware/authenticate");
const Translation = require('../Model/TranslateModel.js');

// Function to remove duplicate sentences
const removeDuplicates = (arr) => {
    return [...new Set(arr)];
};

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

        const allSentences = paginatedGroups.flatMap(group => group.sentences);
        const uniqueSentences = [...new Set(allSentences.map(s => String(s)))];

        // Only DB lookup — no external API
        const translations = await Translation.find({ original: { $in: uniqueSentences } }).lean();

        const hindiMap = {};
        const clientLangMap = {};

        translations.forEach(doc => {
            hindiMap[doc.original] = doc.hindi?.value || "";
            const clientTranslation = doc.clientLang?.[clientLang]?.approved || "";
            clientLangMap[doc.original] = clientTranslation;
        });

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


module.exports = router;
