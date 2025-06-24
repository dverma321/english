const mongoose = require('mongoose');

// Subschema for suggestions
const suggestionSchema = new mongoose.Schema({
  value: String,
  suggestedBy: String
}, { _id: false });

// Subschema for clientLang values
const clientLangSubSchema = new mongoose.Schema({
  approved: String,
  suggestions: [suggestionSchema]
}, { _id: false });

const translationSchema = new mongoose.Schema({
  original: { type: String, required: true },

  // Admin directly manages Hindi — no suggestions or approval needed
  hindi: { type: String },

  // Dynamic client languages, like fr, es, de, etc.
  clientLang: {
    type: Map,
    of: clientLangSubSchema
  }
});

module.exports = mongoose.model('Translation', translationSchema);
