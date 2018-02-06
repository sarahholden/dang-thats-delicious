// Mongoose is the package we use to interface with MongoDB
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
// Hashing algorithm used to get gravatar by hashing email address for security
const md5 = require('md5');
const validator = require('validator');
const mongodbErrorHandler = require('mongoose-mongodb-errors');
const passportLocalMongoose = require('passport-local-mongoose');
// Use built-in ES6 promises
mongoose.Promise = global.Promise;
// URL friendly names for slugs
// const slug = require('slugs');

const userSchema = new Schema({
  email: {
    type: String,
    unique: true,
    trim: true,
    lowercase: true,
    validate: [validator.isEmail, 'Invalid Email Address'],
    required: 'Please supply an email address',

  },
  name: {
    type: String,
    required: 'Please Supply a Name',
    trim: true
  },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  hearts: [
    { type: mongoose.Schema.ObjectId, ref: 'Store' }
  ]
});

// we can use .virtual() to set a gravatar for users since we already
// have their email, so we're not adding a new field, we're just
// pulling a virtual gravatar and generate it on the fly
// Could be the same for something like converting speed or currency units
userSchema.virtual('gravatar').get(function () {
  const hash = md5(this.email);
  return `https://gravatar.com/avatar/${hash}?s=200`;
});

userSchema.plugin(passportLocalMongoose, { usernameField: 'email' });
// Add cleaner error messages when name isn't unique
userSchema.plugin(mongodbErrorHandler);

// Import in start.js
module.exports = mongoose.model('User', userSchema);
