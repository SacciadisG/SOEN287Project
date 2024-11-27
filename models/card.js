const mongoose = require('mongoose');

const cardSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    cardType: { type: String, required: true },
    cardNumber: { type: String, required: true },
    expiryDate: { type: String, required: true },
    cardName: { type: String, required: true },
});


module.exports = mongoose.model('Card', cardSchema);



