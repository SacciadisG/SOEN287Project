const BusinessInfo = require('./models/business_info'); 
const User = require('./models/user'); 
const Service = require('./models/service'); // Adjust the path as needed
const passportLocalMongoose = require('passport-local-mongoose');

async function initializeBusinessInfo() {
    try {
        const existingBusinessInfo = await BusinessInfo.findOne();
        if (!existingBusinessInfo) {
            const defaultBusinessInfo = new BusinessInfo({
                name: "Business Name",
                address: "123 Concordia Street",
                postal_code: "A1B 2C3",
                email: "default.email@domain.com",
                phone: "123-456-7890",
            });
            await defaultBusinessInfo.save();
            console.log("Initialized BusinessInfo with default values.");
        } else {
            console.log("BusinessInfo already exists. No initialization needed.");
        }
    } catch (error) {
        console.error("Error initializing BusinessInfo:", error);
    }
}

async function ensureAdminAccount() {
    try {
        const adminExists = await User.findOne({ isAdmin: true });

        if (!adminExists) {
            const admin = new User({
                username: 'admin', // Replace with process.env.ADMIN_USERNAME for better security
                isAdmin: true,
                full_name: 'Admin User',
                email: 'admin@example.com',
                phone_number: '1234567890'
            });

            // Use Passport's setPassword to hash and save the password
            await admin.setPassword('admin'); // Replace with process.env.ADMIN_PASSWORD for better security
            await admin.save();

            console.log('Admin account created with username: admin and password: admin');
        } else {
            console.log('Admin account already exists');
        }
    } catch (error) {
        console.error('Error ensuring admin account:', error);
    }
};

async function seedServices() {
    try {
        const existingServices = await Service.find();
        if (existingServices.length > 0) {
            console.log("Services already exist. Skipping seeding.");
            return;
        }

        const sampleServices = [
            {
                name: "Basic Cleaning",
                price: 50,
                description: "A basic cleaning service for residential spaces."
            },
            {
                name: "Deep Cleaning",
                price: 150,
                description: "Comprehensive cleaning for residential and commercial spaces."
            },
            {
                name: "Lawn Maintenance",
                price: 75,
                description: "Regular lawn mowing and trimming services."
            },
            {
                name: "Home Organization",
                price: 200,
                description: "Organize your home spaces efficiently and aesthetically."
            },
            {
                name: "Carpet Cleaning",
                price: 100,
                description: "Specialized cleaning for carpets and rugs."
            },
            {
                name: "Pet Grooming",
                price: 80,
                description: "Complete grooming services for your pets."
            },
            {
                name: "Window Washing",
                price: 60,
                description: "Professional window washing for homes and offices."
            },
            {
                name: "Moving Assistance",
                price: 300,
                description: "Help with packing, moving, and setting up your belongings."
            },
        ];

        await Service.insertMany(sampleServices);
        console.log("Seeded sample services into the database.");
    } catch (error) {
        console.error("Error seeding services:", error);
    }
}

// General startup function to run all scripts
async function runStartupScripts() {
    console.log("Running startup scripts..."); // Testing start
    await initializeBusinessInfo();
    await ensureAdminAccount();
    await seedServices();
    console.log("Startup scripts completed."); // Confirmation testing
}

module.exports = runStartupScripts;
