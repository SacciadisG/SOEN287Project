const BusinessInfo = require('./models/business_info'); // Adjust path as needed

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

// General startup function to run all scripts
async function runStartupScripts() {
    console.log("Running startup scripts..."); // Testing start
    await initializeBusinessInfo();
    console.log("Startup scripts completed."); // Confirmation testing
}

module.exports = runStartupScripts;
