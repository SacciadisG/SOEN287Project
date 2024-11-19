const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const passportLocalMongoose = require('passport-local-mongoose'); //This isn't needed here tbh, but I'm keeping it for consistency

const ServiceSchema = new Schema({
    name: { type: String, required: true },
    price: { type: Number, required: true },
    description: { type: String, required: true }
    //All fields - ask Greg if you think we need more.
});

module.exports = mongoose.model('Service', ServiceSchema);