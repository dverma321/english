const translate = require('google-translate-api-x'); // Correct way to import

const translateText = async (sentences, targetLang) => {
    try {
        const translations = await Promise.all(
            sentences.map(async (sentence) => {
                const res = await translate(sentence, { to: targetLang });
                return res.text; // Extract the translated text
            })
        );

        return translations;
    } catch (error) {
        console.error("Translation failed:", error.message);
        throw error;
    }
};

module.exports = translateText;
