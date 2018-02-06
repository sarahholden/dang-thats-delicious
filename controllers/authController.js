// Passport is the library we're using to log our users in
const passport = require('passport');
const crypto = require('crypto');
const mongoose = require('mongoose');
const promisify = require('es6-promisify');
const mail = require('../handlers/mail');

const User = mongoose.model('User');

// Taking advantage of some middleware that comes with passport .authenticate
// 'local': allows us to use a username and pw (versus FB login or something)
// BEFORE using 'local' we need to configure passport in handlers/passport.js
exports.login = passport.authenticate('local', {
  failureRedirect: '/login',
  failureFlash: 'Failed Login!',
  successRedirect: '/',
  successFlash: 'You are now logged in!'
});

exports.logout = (req, res) => {
  req.logout();
  req.flash('success', 'You are now logged out 👋🏻'),
  res.redirect('/')
};

exports.isLoggedIn = (req, res, next) => {
  // first check if the user is authenticated (isAuthenticated comes with Passport)
  if (req.isAuthenticated()) {
    next();
    return;
  }
  req.flash('error', 'Oops! you must be logged in to do that!');
  res.redirect('/login');
};

exports.forgot = async (req, res) => {
  // 1. See if a user with that email exists
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    // Can also just say that an email has been sent if accounts are sensitive info
    req.flash('error', 'No account with that email exists');
    return res.redirect();
  }
  // 2. Set reset tokens and expiry on their account
  // A. Generate a random token and set an expiry date
  // Crypto is built into node (don't have to npm install). It allows us to generate random hex
  user.resetPasswordToken = crypto.randomBytes(20).toString('hex');
  user.resetPasswordExpires = Date.now() + 3600000;
  // B. Save the token & expiry on the user (need to add to User model in User.js too)
  await user.save();
  // 3. Send them an email with the token
  const resetURL = `http://${req.headers.host}/account/reset/${user.resetPasswordToken}`;
  await mail.send({
    user,
    subject: 'Password Reset',
    resetURL,
    filename: 'password-reset'
  });

  req.flash('success', `You have been emailed a password reset link.`);
  // 4. Redirect to login page after token has been sent
  res.redirect('/login');
};

exports.reset = async (req, res) => {
  const user = await User.findOne({
    resetPasswordToken: req.params.token,
    resetPasswordExpires: { $gt: Date.now() } // Look for an expires token that is greater than now
    // $gt is part of Mongoose (or MongoDB?)
  });
  if (!user) {
    req.flash('error', 'Password reset is invalid or has expired');
    return res.redirect('/login');
  }
  res.render('reset', { title: 'Reset Your Password' });
};

exports.confirmedPasswords = async (req, res, next) => {
  if (req.body.password === req.body['password-confirm']) {
    next();
    return;
  }
  req.flash('error', 'Passwords do not match!');
  res.redirect('back');
};

exports.update = async (req, res) => {
  // Make sure we're still within the expiry timeframe
  // (we don't want them to leave the pw page open)
  const user = await User.findOne({
    resetPasswordToken: req.params.token,
    resetPasswordExpires: { $gt: Date.now() }
  });

  if (!user) {
    req.flash('error', 'Password reset is invalid or has expired');
    return res.redirect('/login');
  }

  // .setPassword() made available through passportLocalMongoose plugin in User.js
  // BUT need to promisify it!
  const setPassword = promisify(user.setPassword, user);
  await setPassword(req.body.password);
  // Reset the token and expiry on the user
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  const updatedUser = await user.save();
  // .login Comes with passport.js
  // Passport allows us to pass an actual user and we can use this to log them in
  // (instead of having to pass a username and password)
  await req.login(updatedUser);
  req.flash('Success', '💃🏻 Nice! Your password has been reset! You are now logged in!');
  res.redirect('/');
};
