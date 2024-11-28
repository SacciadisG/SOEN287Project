const isLoggedIn = (req, res, next) => {
    if (!req.isAuthenticated()) {
      //Add flash here, later => *Advise user they need to be logged in to proceed
      console.log("Not authenticated"); //For testing purposes
      return res.redirect("/login");
    }
    next();
  };
  const isAdmin = (req, res, next) => {
    if (req.isAuthenticated() && req.user.isAdmin) {
      return next();
    }
    res.status(403).json({ message: "Access restricted to business owners only" });
  };
  
  module.exports = {
    isLoggedIn,
    isAdmin
  };
  