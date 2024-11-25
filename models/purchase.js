const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PurchaseSchema = new Schema({
    service: {
        type: Schema.Types.ObjectId,
        ref: 'Service',
        required: true
    },
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    datePurchased: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'rejected'], // Restrict the values to the allowed statuses
        default: 'pending', // Default status when a purchase is created
        required: true
    }
});

module.exports = mongoose.model('Purchase', PurchaseSchema);
