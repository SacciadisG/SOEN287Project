const mongoose = require('mongoose');

const BusinessInfoSchema = new mongoose.Schema({
    name: { type: String, required: true },
    address: { type: String, required: true },
    postal_code: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    logo: { type: String }, // URL or file path to the logo image
});

module.exports = mongoose.model('BusinessInfo', BusinessInfoSchema);


