// Mongoose is the package we use to interface with MongoDB
const mongoose = require('mongoose');
// Use built-in ES6 promises
mongoose.Promise = global.Promise;
// URL friendly names for slugs
const slug = require('slugs');

const storeSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    required: 'Please enter a store name!'
  },
  slug: String,
  description: {
    type: String,
    trim: true
  },
  tags: [String],
  created: {
    type: Date,
    default: Date.now
  },
  // Can use square brackets in template to send nested data (see _storeForm.pug)
  location: {
    type: {
      type: String,
      default: 'Point'
    },
    coordinates: [{
      type: Number,
      required: 'You must supply coordinates!'
    }],
    address: {
      type: String,
      required: 'You must supply an address!'
    }
  },
  photo: String,
  author: {
    // We want to set up a relationship between the store and the user
    type: mongoose.Schema.ObjectId,
    // This is where we specify that the author is equal to 'User'
    // ('User' exported at the bottom of the User.js model)
    ref: 'User',
    required: 'You must supply an author'
  }
}, {
  toJSON: { virtuals: true }, // These lines will make sure the review data
  // is available in the .pug file when we pass in the JSON from the store model
  toObject: { virtuals: true }
});

// Define our indexes
// We'll want to index any data we'll be searching for a lot to optimize our queries
storeSchema.index({
  name: 'text',
  description: 'text'
});

storeSchema.index({ location: '2dsphere' });

// Before store is saved, generate a slug
storeSchema.pre('save', async function(next) {
  // if they didn't change the name
  if (!this.isModified('name')) {
    next(); // skip it
    return; // stop this function from running
  }
  this.slug = slug(this.name);
  // Make sure that each store has a unique slug
  // Search for stores that have the same slug, or the same slug + a -#
  const slugRegEx = new RegExp(`^(${this.slug})((-[0-9]*$)?)$`, 'i');
  const storesWithSlug = await this.constructor.find({ slug: slugRegEx });
  if (storesWithSlug.length) {
    this.slug = `${this.slug}-${storesWithSlug.length + 1}`;
  }
  next();
});

// TODO: use another library and another pre 'save' function to strip any extra
// HTML from fields the user entered
// For example, we don't want them to add HTML in the store name field like an img tag

// Add a method using .statics
// Use proper function so you can use this
storeSchema.statics.getTagsList = function () {
  return this.aggregate([
    { $unwind: '$tags' },
    { $group: { _id: '$tags', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
};

storeSchema.statics.getTopStores = function () {
  // We can't use our virtual method below since it doesn't know about .aggregate()
  return this.aggregate([
    // Step 1: Lookup Stores and populate their reviews
    // from: 'reviews' explanation: Mongoose lowercases the model and adds an s
    { $lookup: { from: 'reviews', localField: '_id', foreignField: 'store', as: 'reviews' } },
    // Step 2: filter for only items that have 2 or more reviews
    // 'reviews.1' is how you access things that are index based in JS
    // 'reviews.0' would be the first review, 'reviews.1' would be the second
    { $match: { 'reviews.1': { $exists: true } } },
    // Step 3: Add the average reviews fields
    { $project: {
      // Need to re-add data since we're running a version of MongoDB that isn't the very latest
      // Otherwise if we're using 3.4 we can use $addField instead of $project
      photo: '$$ROOT.photo',
      name: '$$ROOT.name',
      reviews: '$$ROOT.reviews',
      slug: '$$ROOT.slug',
      // create a new field averageRating, set the value to the $avg
      averageRating: { $avg: '$reviews.rating' }
    } },
    // Step 4: sort it by our new field, highest reviews First
    { $sort: { averageRating: -1 } },
    // Step 5: limit to at most 10
    { $limit: 10 }
  ]);
};

// This is how we associate our reviews with the store they are related to
// We want to keep them in sync since they are related!
storeSchema.virtual('reviews', {
  ref: 'Review', // What model to link?
  localField: '_id', // Which field on the store?
  foreignField: 'store' // Which field on the review?
});

function autopopulate(next) {
  this.populate('reviews');
  next();
}

storeSchema.pre('find', autopopulate);
storeSchema.pre('findOne', autopopulate);

module.exports = mongoose.model('Store', storeSchema);
