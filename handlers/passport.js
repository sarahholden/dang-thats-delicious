// These steps are required to configure 'local' for passport so that we can use it
// in authController.js
const passport = require('passport');
const mongoose = require('mongoose');

const User = mongoose.model('User');

// .createStrategy comes from the plugin passportLocalMongoose added in User.js
passport.use(User.createStrategy());

// We want to pass along the User object so that we can show info
// that is specific to that user.
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


// Import in app.js
