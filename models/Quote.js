const mongoose = require('mongoose');
const QuoteSchema = new mongoose.Schema({
    customerName: String,
    email: String,
    service: String,
    details: String,
    referenceImage: String,
    date: { type: Date, default: Date.now }
});
module.exports = mongoose.model('Quote', QuoteSchema);