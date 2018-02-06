const mongoose = require('mongoose');
const promisify = require('es6-promisify');
// Imported in start.js
// 'Store' comes from bottom of Store.js model
const User = mongoose.model('User');



exports.loginForm = (req, res) => {
  res.render('login', { title: 'Login' });
};

exports.registerForm = (req, res) => {
  res.render('register', { title: 'Register' });
};

exports.validateRegister = (req, res, next) => {
  // sanitizeBody comes from expressValidator in app.js
  req.sanitizeBody('name');
  req.checkBody('name', 'You must supply a name!').notEmpty();
  req.checkBody('email', 'That email is not valid').isEmail();
  req.sanitizeBody('email').normalizeEmail({
    remove_dots: false,
    remove_extension: false,
    gmail_remove_subaddress: false
  });
  req.checkBody('password', 'Password Cannot be Blank!').notEmpty();
  req.checkBody('password-confirm', 'Confirmed Password cannot be blank!').notEmpty();
  req.checkBody('password-confirm', 'Oops! Your passwords do not match').equals(req.body.password);

  const errors = req.validationErrors();
  if(errors) {
    req.flash('error', errors.map(err => err.msg));
    res.render('register', { title: 'Register', body: req.body, flashes: req.flash() });
    return; // Stop the funciton from running
  }
  next();
};

// need next since this is middleware
exports.register = async (req, res, next) => {
  const user = new User({ email: req.body.email, name: req.body.name });
  // .register is part of passportLocalMongoose plugin imported in User.js
  // User.register(user, req.body.password, function (err, user) {
  //
  // });
  // Turn the above into async / await using the following lines
  // 1. the method you want to promisify (User.register)
  // 2. Since User.register is a method, we also need to pass it which object to bind it to (User)
  // Step 2 is necessary when the method lives on an object (User.register)
  const register = promisify(User.register, User);
  // The line above prevents us from having to use a callback function
  // Below line: We pass the password as the second argument so that it will be turned into a HASH
  // This is why the password is not provided above for user, just the email and name.
  await register(user, req.body.password);
  next();
};

exports.account = async (req, res) => {
  // Query the db for a list of all stores.
  // const account = await User.find();
  res.render('account', { title: 'Edit your Account' });
};

exports.updateAccount = async (req, res) => {
  // Only the info that needs to be updated (not the password)
  const updates = {
    name: req.body.name,
    email: req.body.email
  };

  const user = await User.findOneAndUpdate(
    { _id: req.user._id },
    { $set: updates }, // Take the updates object and set it on top of what exists on the user
    {
      new: true, // return the new user
      runValidators: true,
      context: 'query' // needs to be there for Mongoose? Hmm
    }
  );

  req.flash('success', 'Your account has been updated 👍🏻');
  // Take the user back to where they previously were
  res.redirect('back');
};
