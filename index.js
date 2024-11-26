//DEPENDENCIES
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const ejsMate = require('ejs-mate');
const methodOverride = require('method-override');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local');

const app = express(); //Renaming since it's easier to write app.[method]

//Serves static files (eg. css files) from the 'public' directory
app.use(express.static('public'));

//MODELS
const User = require('./models/user');
const Service = require('./models/service');
const BusinessInfo = require('./models/business_info'); 
const Purchase = require('./models/purchase');

//STARTUP SCRIPTS AT RUNTIME
const runStartupScripts = require('./startup');

//DATABASE SETUP
//Connect to mongoose
mongoose.connect('mongodb://localhost:27017/soen287project');

//Mongoose's proposed db connection check
const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", async () => {
    console.log("Database connected");
    await runStartupScripts(); // Initialize BusinessInfo on startup & other stuff to come..
});

//EXPRESS SETUP
//Remember to npm install path and ejs and ejs mate for this
app.engine('ejs', ejsMate); // Use ejsMate for rendering EJS templates
app.set('view engine', 'ejs'); // Set ejs as the default templating engine
app.set('views', path.join(__dirname, 'views')); // Set the directory for ejs template files
app.use(express.urlencoded({ extended: true })); //Helps with parsing the request body

//Remember to npm install method-override for this
app.use(methodOverride('_method'));

//PASSPORT & SESSION SETUP
const sessionConfig = {
    secret: 'soen287',
    resave: false,
    saveUninitialized: true,
    cookie: {
        httpOnly: true,
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
        maxAge: 1000 * 60 * 60 * 24 * 7
    }
}

app.use(session(sessionConfig)); //Setup express session
app.use(passport.initialize()); //Initialize passport framework
app.use(passport.session()); //Be sure to 'use' this after we use 'session'
passport.use(new LocalStrategy(User.authenticate())); //Telling passport to use the passport-given authentication method for our User model

passport.serializeUser(User.serializeUser()); //How to store a user in the session i.e. log them in & keep them logged in
passport.deserializeUser(User.deserializeUser()); //How to remove a user from a session i.e. log them out

//Middleware that'll execute on every request to the server
app.use(async(req, res, next) => {
    //Note that res.locals is meant for data passed to the "views" folder. 
    //It's not automatically available in all routes!
    res.locals.currentUser = req.user;
    try {
        // Fetch the BusinessInfo (there should always be one after initialization)
        const businessInfo = await BusinessInfo.findOne();
        if (businessInfo) {
            res.locals.businessInfo = businessInfo; // Attach the info to res.locals
        } else {
            // If for some reason it doesn't exist, provide default values
            res.locals.businessInfo = {
                name: "Default Business Name",
                address: "123 Default Street",
                postal_code: "A1B 2C3",
                email: "default.email@domain.com",
                phone: "123-456-7890",
            };
        }
    } catch (error) {
        console.error("Error fetching business info:", error);
        // Provide default values in case of an error
        res.locals.businessInfo = {
            name: "Default Business Name",
            address: "123 Default Street",
            postal_code: "A1B 2C3",
            email: "default.email@domain.com",
            phone: "123-456-7890",
        };
        next(); // Proceed to the next middleware or route
    }
    next(); 
})


//STANDARD ROUTES (REGISTER, LOGIN, LOGOUT)
app.get('/register', (req, res) => {
    res.render('register')
})

app.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = new User({ username });
        const registeredUser = await User.register(user, password);
        req.login(registeredUser, err => {
            if(err) return next(err); //Callback function if an error occurs
            res.redirect('/login');
        })
    } catch(e) {
        res.redirect('register'); //Something happened, so go back to the register page
    }
})

app.get('/login', (req, res) => {
    res.render('login')
})

app.post('/login', passport.authenticate('local', { failureRedirect: '/login' }), (req, res) => {
    //If they're a business admin, redirect to the business dashboard; else, go to the client dahsboard
    if (req.user.isAdmin) {
        res.redirect('/business/index');
    }
    else {
        res.redirect('/client/index')
    }
})

//Passport's logout requires a callback function, so it has a bit more code
app.post('/logout', (req, res, next) => {
    req.logout(function (err) {
        if (err) {
            return next(err);
        }
        res.redirect('/login');
    });
});

//BUSINESS ROUTES
app.get('/business/index', (req, res) => {
    res.render('business/business_index');
})

app.get('/business/edit', async (req, res) => {
    try {
        //const businessInfo = await BusinessInfo.findOne(); // Assumes one document for business info
        //res.render('business/business_edit', { businessInfo });
        res.render('business/business_edit');
    } catch (err) {
        console.error("Error fetching business info:", err);
        res.redirect('/business/index');
    }
});

//Updates the business information 
app.put('/business/edit', async (req, res) => {
    try {
        const { name, address, postal_code, email, phone } = req.body;

        const updatedData = { name, address, postal_code, email, phone };

        // Update the business info in the database
        const updatedBusinessInfo = await BusinessInfo.findOneAndUpdate(
            {}, // Empty query to match the single document
            updatedData,
            { new: true, upsert: true } // Return the updated document or create one if none exists
        );

        // req.flash('success', 'Business info updated successfully!'); *IMPLEMENT THIS LATER
        res.redirect('/business/index');
    } catch (err) {
        console.error("Error updating business info:", err);
        //req.flash('error', 'Failed to update business info.'); *IMPLEMENT THIS LATER
        res.redirect('/business/edit');
    }
});

//CLIENT ROUTES
app.get('/client/account', (req, res) => {
    res.render('client/account');
})

//Implement the rest below..

app.get('/client/index', (req, res) => {
    res.render('client/client_index');
})

app.get('/client/client_index', (req, res) => {
    res.render('client/client_index');
})

app.get('/client/communication', (req, res) => {
    res.render('client/communication');
})

app.get('/client/services_search', async (req, res) => {
    const services = await Service.find({});
    res.render('client/services_search', { services }); //Loads up all services to the rendered page
})

app.post('/client/services_search', async (req, res) => {
    try {
        // Get the current user and the service ID from the request
        const { serviceId } = req.body;
        const currentUser = res.locals.currentUser;

        // Find the service by ID
        const service = await Service.findById(serviceId);

        // Create the new purchase
        const newPurchase = new Purchase({
            service: service._id,
            user: currentUser._id, // Use the current user's ID
        });

        await newPurchase.save();
    } catch (error) {
        console.error('Error creating purchase:', error);
    }
    res.redirect('/client/index');
});

app.put('/client/edit', async (req, res) => {
    console.log("a")
    try {
        const { full_name, email, phone_number } = req.body;
        const currentUser = res.locals.currentUser;
        const updatedData = { full_name, email, phone_number };

        // Update the business info in the database
        const updatedClientInfo = await User.findOneAndUpdate(
            { username: currentUser.username }, // Empty query to match the single document
            updatedData,
            { new: true, upsert: true } // Return the updated document or create one if none exists
        );

        // req.flash('success', 'Business info updated successfully!'); *IMPLEMENT THIS LATER
        res.redirect('/client/client_index');
    } catch (err) {
        console.error("Error updating business info:", err);
        //req.flash('error', 'Failed to update business info.'); *IMPLEMENT THIS LATER
        res.redirect('/client/edit');
    }
});

app.get('/client/faq', (req, res) => {
    res.render('client/faq');
})

app.get('/client/notification', (req, res) => {
    res.render('client/notification');
})

app.get('/client/payment', (req, res) => {
    res.render('client/payment');
})

app.get('/client/profile', (req, res) => {
    try {
        //const businessInfo = await BusinessInfo.findOne(); // Assumes one document for business info
        //res.render('business/business_edit', { businessInfo });
        res.render('client/profile');
    } catch (err) {
        console.error("Error fetching user info:", err);
        res.redirect('/client/client_index');
    }
})

app.get('/client/receipts_view', (req, res) => {
    res.render('client/receipts_view', { currentUser: req.user });
})

app.get('/client/services_bill', (req, res) => {
    res.render('client/services_bill');
})

app.get('/client/services_cancel', (req, res) => {
    res.render('client/services_cancel');
})

app.get('/client/services_request', (req, res) => {
    res.render('client/services_request');
})

app.get('/client/services_view', (req, res) => {
    res.render('client/services_view', { currentUser: req.user });
})


//Runs server on port 3000 (standard port)
app.listen(3000, () => {
    console.log("APP IS LISTENING ON PORT 3000!") //For testing purposes!
})