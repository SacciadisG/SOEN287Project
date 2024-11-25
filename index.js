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

//DATABASE SETUP
//Connect to mongoose
mongoose.connect('mongodb://localhost:27017/soen287project');

//Mongoose's proposed db connection check
const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:")); //Listens for "Error" event & triggers if found
db.once("open", () => { //Listens for "Open" event, i.e. an established connection with MongoDB & triggers if found
    console.log("Database connected");
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

//Middleware that'll execute on every request to the server
app.use((req, res, next) => {
    //Note that res.locals is meant for data passed to the "views" folder. 
    //It's not automatically available in all routes!
    res.locals.currentUser = req.user;
    //Can add more here, as needed*
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

//BUSINESS ROUTES_______________________________________________________________________________________________________
app.get('/business/index', (req, res) => {
    res.render('business/business_index');
})

//Implement the rest below..

//GET route for the modify services page
app.get('/business/services', async (req, res) => {
    try {
        const services = await Service.find();                      //Fetch all services from the database
        res.render('business/services_modify', { services });       //Pass services to the EJS view
    } catch (err) {
        console.error(err);
        res.status(500).send("Error retrieving services");
    }
});

//POST route for adding a new service
app.post('/business/services', async (req, res) => {
    try {
        const { name, price, description } = req.body;
        const newService = new Service({ name, price, description });
        await newService.save();
        res.redirect('/business/services');
    } catch (err) {
        console.error(err);
        res.status(500).send("Error adding the service");
    }
});

//PUT route for editing a service
app.put('/business/services/:id', async (req, res) => {
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
app.delete('/business/services/:id', async (req, res) => {
    try {
        const { id } = req.params; // Extract service ID from the route
        await Service.findByIdAndDelete(id); // Delete the service from the database
        res.redirect('/business/services'); // Redirect back to the Modify Services page
    } catch (err) {
        console.error(err);
        res.status(500).send("Error deleting the service");
    }
});

//CLIENT ROUTES_________________________________________________________________________________________________________
app.get('/client/index', (req, res) => {
    res.render('client/client_index');
})

app.get('/client/communication', (req, res) => {
    res.render('client/communication');
})

//Implement the rest below..

//Runs server on port 3000 (standard port)
app.listen(3000, () => {
    console.log("APP IS LISTENING ON PORT 3000!") //For testing purposes!
})