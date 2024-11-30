//DEPENDENCIES
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const ejsMate = require('ejs-mate');
const methodOverride = require('method-override');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const fs = require('fs');
const flash = require('connect-flash');

const app = express(); //Renaming since it's easier to write app.[method]
const { isLoggedIn, isAdmin } = require('./middleware');

//CORS Configuration
app.use(cors());
// Middleware
app.use(bodyParser.json());
//Serves static files (eg. css files) from the 'public' directory
app.use(express.static('public'));

//MODELS
const User = require('./models/user');
const Service = require('./models/service');
const BusinessInfo = require('./models/business_info'); 
const Purchase = require('./models/purchase');
const Card = require('./models/card'); 

//IMAGE UPLOAD SETUP
// Set up Multer for storing uploaded files
const uploadDir = path.join(__dirname, 'public/uploads');

// Check if the directory exists, if not, create it
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, 'public/uploads')); // Ensure this matches your directory structure
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`); // Generate a unique filename
    }
});
const upload = multer({ storage });
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));


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

//jerush added
app.use(express.json()); // For parsing JSON bodies

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

// Flash configuration
app.use(flash());

//Middleware that'll execute on every request to the server
app.use(async(req, res, next) => {
    //Note that res.locals is meant for data passed to the "views" folder. 
    //It's not automatically available in all routes!
    res.locals.currentUser = req.user;
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
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

app.post('/register', async (req, res, next) => {
    try {
        const { username, password, full_name, email, phone_number } = req.body;

        if (username.toLowerCase() === 'admin') {
            req.flash('error', 'The username "admin" is not allowed.');
            return res.redirect('/register');
        }

        const user = new User({ username, full_name, email, phone_number });
        const registeredUser = await User.register(user, password);

        req.login(registeredUser, err => {
            if (err) return next(err);
            req.flash('success', 'Welcome! Your account has been created.');
            res.redirect('/client/index');
        });
    } catch (e) {
        console.error('Error during registration:', e);
        req.flash('error', 'Registration failed. Please try again.');
        res.redirect('/register');
    }
});


app.get('/login', (req, res) => {
    res.render('login')
})

app.post('/login', passport.authenticate('local', {
    failureRedirect: '/login',
    failureFlash: true // Automatically flashes an error message for failed login
}), (req, res) => {
    const redirectUrl = req.user.isAdmin ? '/business/index' : '/client/index';
    req.flash('success', 'Welcome back!');
    res.redirect(redirectUrl);
});


//Passport's logout requires a callback function, so it has a bit more code
app.post('/logout', isLoggedIn, (req, res, next) => {
    req.logout(function (err) {
        if (err) {
            return next(err);
        }
        res.redirect('/login');
    });
});

//BUSINESS ROUTES___
//Business Dashboard
app.get('/business/index', isAdmin, (req, res) => {
    res.render('business/business_index');
})

//Edit Business Info Page
app.get('/business/edit', isAdmin, async (req, res) => {
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
app.put('/business/edit', isAdmin, async (req, res) => {
    try {
        const { name, address, postal_code, email, phone } = req.body;
        await BusinessInfo.findOneAndUpdate({}, { name, address, postal_code, email, phone }, { new: true, upsert: true });
        req.flash('success', 'Business info updated successfully!');
        res.redirect('/business/index');
    } catch (err) {
        console.error("Error updating business info:", err);
        req.flash('error', 'Failed to update business info.');
        res.redirect('/business/edit');
    }
});


// Handle logo upload
app.put('/business/logo', isAdmin, upload.single('logo'), async (req, res) => {
    try {
        if (!req.file) {
            throw new Error('File upload failed.');
        }

        const logoPath = `/uploads/${req.file.filename}`;
        const businessId = req.body.businessId;

        // Update the logo in the database
        await BusinessInfo.findByIdAndUpdate(businessId, { logo: logoPath });

        res.redirect('/business/edit');
    } catch (error) {
        console.error('Error uploading logo:', error);
        res.status(500).send('Server Error: Unable to upload logo.');
    }
});


//See requested services
app.get('/business/services_requested', isAdmin, async(req, res) => {
    try {
        const purchases = await Purchase.find({})
        .populate('service') // Replace 'service' ObjectId with the actual Service document
        .populate('user'); // Replace 'user' ObjectId with the actual User document
        res.render('business/services_requested', {purchases});
    } catch (err) {
        console.error("Error fetching purchases:", err);
        res.redirect('/business/index');
    }
})

app.patch('/business/services_requested/:id', isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['confirmed', 'rejected'].includes(status)) {
            req.flash('error', 'Invalid status update.');
            return res.redirect('/business/services_requested');
        }

        await Purchase.findByIdAndUpdate(id, { status });
        req.flash('success', `Purchase status updated to "${status}".`);
        res.redirect('/business/services_requested');
    } catch (err) {
        console.error('Error updating purchase status:', err);
        req.flash('error', 'Failed to update purchase status.');
        res.redirect('/business/services_requested');
    }
});



//See (confirmed) clients' purchased services
app.get('/business/services_purchased', isAdmin, async (req, res) => {
    try {
        const purchases = await Purchase.find({})
        .populate('service') // Replace 'service' ObjectId with the actual Service document
        .populate('user'); // Replace 'user' ObjectId with the actual User document
        res.render('business/services_purchased', {purchases});
    } catch (err) {
        console.error("Error fetching purchases:", err);
        res.redirect('/business/index');
    }
})

//GET route for the modify services page
app.get('/business/services', isAdmin, async (req, res) => {
    try {
        const services = await Service.find();                      //Fetch all services from the database
        res.render('business/services_modify', { services });       //Pass services to the EJS view
    } catch (err) {
        console.error(err);
        res.status(500).send("Error retrieving services");
    }
});

//POST route for adding a new service
app.post('/business/services', isAdmin, async (req, res) => {
    try {
        const { name, price, description } = req.body;
        const newService = new Service({ name, price, description });
        await newService.save();
        req.flash('success', 'Service added successfully!');
        res.redirect('/business/services');
    } catch (err) {
        console.error(err);
        req.flash('error', 'Failed to add service.');
        res.redirect('/business/services');
    }
});


//PUT route for editing a service
app.put('/business/services/:id', isAdmin, async (req, res) => {
    try {
        const { id } = req.params;                                  //Extract service ID from the route
        const { name, description } = req.body;                     //Extract updated name and description from the request body
        await Service.findByIdAndUpdate(id, { name, description }); //Update the service in the database
        res.redirect('/business/services');                         //Redirect back to the Modify Services page
    } catch (err) {
        console.error(err);
        res.status(500).send("Error updating the service");
    }
});

//DELETE route for deleting a service
app.delete('/business/services/:id', isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        await Service.findByIdAndDelete(id);
        req.flash('success', 'Service deleted successfully!');
        res.redirect('/business/services');
    } catch (err) {
        console.error(err);
        req.flash('error', 'Failed to delete service.');
        res.redirect('/business/services');
    }
});


app.get('/business/contact/:customerId', isAdmin, async (req, res) => {
    try {
        // Fetch the client information by ID
        const client = await User.findById(req.params.customerId);

        // Check if the client exists
        if (!client) {
            return res.status(404).send('Client not found');
        }

        // Fetch all purchases associated with this client
        const purchases = await Purchase.find({ user: req.params.customerId })
            .populate('service'); // Populate the related service information

        // Pass both client and purchases to the EJS template
        res.render('business/contact_customer', { client, purchases });
    } catch (error) {
        console.error('Error fetching client or purchases:', error);
        res.status(500).send('Server Error');
    }
});

//CLIENT ROUTES_________________________________________________________________________________________________________
app.get('/client/index', isLoggedIn, (req, res) => {
    res.render('client/client_index');
})

app.get('/client/communication', isLoggedIn, (req, res) => {
    res.render('client/communication');
})

app.get('/client/payment', isLoggedIn, (req, res) => {
    res.render('client/payment');
})

app.get('/client/notification/:status?', isLoggedIn, async (req, res) => {
    try {
        const { status } = req.params; 
        const currentUser = res.locals.currentUser;

        if (!currentUser) {
            req.flash('error', 'You must be logged in to view your notifications.');
            return res.redirect('/login');
        }

        // Validate the status parameter (if it exists)
        if (status && !['confirmed', 'rejected'].includes(status)) {
            req.flash('error', 'Invalid status update.');
            return res.redirect('/client/notification');
        }

        // Fetch purchases based on the status (confirmed or rejected)
        const filter = status ? { user: currentUser._id, status } : { user: currentUser._id }; // Default to all purchases
        const purchases = await Purchase.find(filter).populate('service').lean();

        if (purchases.length === 0) {
            req.flash('info', 'No purchases found for the selected status.');
        }

        // Render the template with the filtered purchases
        res.render('client/notification', { purchasedServices: purchases, status });
    } catch (err) {
        console.error('Error fetching purchases:', err);
        req.flash('error', 'Failed to fetch notifications. Please try again.');
        res.redirect('/client/index');
    }
});


app.get('/client/faq', isLoggedIn, (req, res) => {
    res.render('client/faq');
})

app.get('/client/profile', isLoggedIn, (req, res) => {
    try {
        res.render('client/profile');
    } catch (err) {
        console.error("Error fetching user info:", err);
        res.redirect('/client/index');
    }
})


app.put('/client/edit', isLoggedIn, async (req, res) => {
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
        res.redirect('/client/index');
    } catch (err) {
        console.error("Error updating business info:", err);
        //req.flash('error', 'Failed to update business info.'); *IMPLEMENT THIS LATER
        res.redirect('/client/edit');
    }
});

app.get('/client/receipts_view', isLoggedIn, async (req, res) => {
    try {
        const currentUser = res.locals.currentUser;

        if (!currentUser) {
            req.flash('error', 'You must be logged in to view your receipts.');
            return res.redirect('/login');
        }

        const confirmedPurchases = await Purchase.find({ 
            user: currentUser._id, 
            status: 'confirmed' 
        }).populate('service').lean();

        res.render('client/receipts_view', { confirmedPurchases });
    } catch (err) {
        console.error('Error fetching confirmed purchases:', err);
        req.flash('error', 'Failed to fetch receipts. Please try again.');
        res.redirect('/client/index');
    }
});


app.get('/client/services_bill', isLoggedIn, (req, res) => {
    res.render('client/services_bill');
})

app.get('/client/services_cancel', isLoggedIn, async (req, res) => {
    try {
        const currentUser = res.locals.currentUser;

        if (!currentUser) {
            req.flash('error', 'You must be logged in to view your pending purchases.');
            return res.redirect('/login');
        }

        // Fetch pending purchases for the logged-in user
        const pendingPurchases = await Purchase.find({ 
            user: currentUser._id, 
            status: 'pending' 
        }).populate('service').lean();

        res.render('client/services_cancel', { pendingPurchases });
    } catch (err) {
        console.error('Error fetching pending purchases:', err);
        req.flash('error', 'Failed to fetch pending purchases. Please try again.');
        res.redirect('/client/index');
    }
});

app.delete('/client/services_cancel/:id', isLoggedIn, async (req, res) => {
    try {
        const { id } = req.params;
        

        // Ensure the user owns the purchase being deleted
        const purchase = await Purchase.findById(id);
        if (!purchase || purchase.user.toString() !== req.user._id.toString()) {
            req.flash('error', 'You are not authorized to cancel this purchase.');
            return res.redirect('/client/services_cancel');
        }

        await Purchase.findByIdAndDelete(id);
        req.flash('success', 'Purchase cancelled successfully.');
        res.redirect('/client/services_cancel');
    } catch (err) {
        console.error('Error cancelling purchase:', err);
        req.flash('error', 'Failed to cancel purchase. Please try again.');
        res.redirect('/client/services_cancel');
    }
});



app.get('/client/services_request', isLoggedIn, (req, res) => {
    res.render('client/services_request');
})

app.get('/client/services_view', isLoggedIn, async (req, res) => {
    try {
        const currentUser = res.locals.currentUser;

        if (!currentUser) {
            req.flash('error', 'You must be logged in to view your purchases.');
            return res.redirect('/login');
        }

        // Fetch purchases for the logged-in user
        const purchases = await Purchase.find({ user: currentUser._id })
            .populate('service') // Populate the service details
            .lean(); // Convert documents to plain objects for easier handling in EJS

        // Filter purchases by status
        const requestedServices = purchases.filter(purchase => purchase.status === 'pending');
        const purchasedServices = purchases.filter(purchase => purchase.status === 'confirmed');

        res.render('client/services_view', { requestedServices, purchasedServices });
    } catch (err) {
        console.error('Error fetching purchases:', err);
        req.flash('error', 'Failed to fetch purchases. Please try again.');
        res.redirect('/client/index');
    }
});


//Service lookup & purchase page
app.get('/client/services_search', isLoggedIn, async (req, res) => {
    const services = await Service.find({});
    res.render('client/services_search', { services }); //Loads up all services to the rendered page
})

//Purchases the selected service
app.post('/client/services_search', isLoggedIn, async (req, res) => {
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

//Implement the rest below..
// Add card
app.post('/addCard', isLoggedIn, async (req, res) => {
    if (!req.user) {
        return res.status(401).send('User not authenticated'); // Handle case if user is not logged in
    }

    const { cardType, cardNumber, expiryDate, cardName } = req.body;

    const newCard = new Card({
        user: req.user._id, // Associate card with the authenticated user
        cardType,
        cardNumber,
        expiryDate,
        cardName,
    });

    try {
        await newCard.save();
        res.status(201).send('Card added successfully!');
    } catch (error) {
        console.error('Error adding card:', error);
        res.status(500).send('Failed to add card.');
    }
});

// Get all cards
app.get('/getCards', isLoggedIn, async (req, res) => {
    if (!req.user) {
        return res.status(401).send('User not authenticated'); // Handle case if user is not logged in
    }

    const userId = req.user._id;
    try {
        const cards = await Card.find({ user: userId });
        res.json(cards);
    } catch (error) {
        console.error('Error fetching cards:', error);
        res.status(500).send('Error fetching cards');
    }
});

// Delete card by ID
app.delete('/deleteCard/:cardId', isLoggedIn, async (req, res) => {
    try {
        const { cardId } = req.params;

        const deletedCard = await Card.findByIdAndDelete(cardId);

        if (deletedCard) {
            res.status(200).json({ message: 'Card deleted successfully' });
        } else {
            res.status(404).json({ message: 'Card not found' });
        }
    } catch (error) {
        console.error('Error deleting card:', error);
        res.status(500).json({ message: 'Failed to delete card' });
    }
});


//Runs server on port 3000 (standard port)
app.listen(3000, () => {
    console.log("APP IS LISTENING ON PORT 3000!") //For testing purposes!
})