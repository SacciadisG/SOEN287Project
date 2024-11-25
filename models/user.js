const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const passportLocalMongoose = require('passport-local-mongoose');

const UserSchema = new Schema({
    //Username & Password are already included with Passport (lookup the documentation, if needed)
    isAdmin: { type: Boolean, default: false, required: true },
    full_name: { type: String, required: false },
    email: { type: String, required: false },
    phone_number: { type: String, required: false },
    //This field below tracks a user's requested services
    service_list: [{
        type: Schema.Types.ObjectId,
        ref: 'Service'
      }]
});

/* Note: 
No need to specify username or password, since passport does it for us.
Passport also makes sure the usernames are unique & offers several methods onto our Schema */
UserSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model('User', UserSchema);