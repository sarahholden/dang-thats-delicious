const mongoose = require('mongoose');
// Imported in start.js
// 'Store' comes from bottom of Store.js model
const Store = mongoose.model('Store');
const User = mongoose.model('User');
const multer = require('multer');
const jimp = require('jimp');
const uuid = require('uuid');

const multerOptions = {
  storage: multer.memoryStorage(),
  fileFilter(req, file, next) {
    const isPhoto = file.mimetype.startsWith('image/');
    if (isPhoto) {
      next(null, true);
    } else {
      next({ message: 'That filetype isn\'t allowed!' }, false);
    }
  }
};

exports.homePage = (req, res) => {
  res.render('index', { title: 'Yum' });
};

exports.addStore = (req, res) => {
  res.render('editStore', { title: '💩 Add Store' });
};

exports.upload = multer(multerOptions).single('photo');

exports.resize = async (req, res, next) => {
  // check if there is no new file to resize
  if (!req.file) {
    next(); // skip to the next middleware
    return;
  }
  // console.log(req.body);
  const extension = req.file.mimetype.split('/')[1];
  req.body.photo = `${uuid.v4()}.${extension}`;
  const photo = await jimp.read(req.file.buffer);
  await photo.resize(800, jimp.AUTO);
  await photo.write(`./public/uploads/${req.body.photo}`);
  // Once we have written the photo to our file system, keep going!
  next();
};

// Add async for a function that will have awaits inside of it
exports.createStore = async (req, res) => {
  req.body.author = req.user._id;
  // Save store to MongoDB database
  // Will return store or an error
  const store = await (new Store(req.body)).save();

  // Flash middleware in app.js. Accepts type of flash and a message
  req.flash('success', `Successfully Created ${store.name}. Care to leave a review?`);
  res.redirect(`/store/${store.slug}`);
};


exports.getStores = async (req, res) => {
  const page = req.params.page || 1;
  const limit = 4;
  const skip = (page * limit) - limit;
  // Query the db for a list of all stores.
  const storesPromise = Store
    .find()
    .skip(skip)
    .limit(limit)
    .sort({ created: 'desc' });

  const countPromise = Store.count();

  const [stores, count] = await Promise.all([storesPromise, countPromise]);

  const pages = Math.ceil(count / limit);
  if (!stores.length && skip) {
    req.flash('info', `This page doesn't exist!`);
    res.redirect(`/stores/page/${pages}`);
    return;
  }

  res.render('stores', { title: 'Stores', stores, page, pages, count });
};

const confirmOwner = (store, user) => {
  // we need to use .equals since store.author is an object id
  // and we need to compare it with a string
  if (!store.author.equals(user._id)) {
    throw Error('You must own a store in order to edit it');
  }
};

exports.editStore = async (req, res) => {
  // 1. Find the store given the ID
  const store = await Store.findOne({ _id: req.params.id });
  // 2. confirm they are the owner of the store
  confirmOwner(store, req.user);
  // 3. Render out the edit form so the user can update their store
  res.render('editStore', { title: `Edit ${store.name}`, store });
};

exports.updateStore = async (req, res) => {
  // Set the location data to be a Point
  req.body.location.type = 'Point';
  const store = await Store.findOneAndUpdate({ _id: req.params.id }, req.body, {
    new: true, // will return new store instead of old one
    runValidators: true, // Will run validators in the Model (such as required, trim, etc.)
  }).exec();
  req.flash('success', `Successfully updated ${store.name}. <a href="/stores/${store.slug}">View Store</a>`);
  res.redirect(`/stores/${store._id}/edit`);
};

exports.getStoreBySlug = async (req, res, next) => {
  // Query the db for the selected store (by slug)
  // .populate('author') will give us access to the author's user object in our template (cool!)
  const store = await Store.findOne({ slug: req.params.slug }).populate('author reviews');
  if (!store) return next();
  res.render('store', { title: store.name, store });
};

exports.getStoresByTag = async (req, res) => {
  const tag = req.params.tag;
  const tagQuery = tag || { $exists: true };
  // Set up two promises
  const tagsPromise = Store.getTagsList();
  const storesPromise = Store.find({ tags: tagQuery });
  // Wait for all promises to come back
  const [tags, stores] = await Promise.all([tagsPromise, storesPromise]);
  // TO show data:
  // res.json(result);
  res.render('tag', { title: 'Tags', tags, tag, stores });
};

exports.searchStores = async (req, res) => {
  // To get the query off of a URL, it's a little different from params
  // If this is the URL in question: http://localhost:7777/api/search?q=beer
  // we could use req.query which will give us everything after q in the URL
  // res.json(req.query);

  // We can use $text since we indexed them by 'text' in Store.js
  const stores = await Store
    // 1. Find stores that match
    .find({
      $text: {
        $search: req.query.q
      }
    }, {
      score: { $meta: 'textScore' } // Project (add) a score to rank items (look up in MongoDB)
    })
    // 2. Sort the resulting stores
    .sort({ // Now let's sort our results!
      score: { $meta: 'textScore' }
    })
    // limit to only 5 results
    .limit(5);

  // To test: go to http://localhost:7777/api/search?q=beer
  // and uncomment the following:
  res.json(stores);
};

exports.mapStores = async (req, res) => {
  const coordinates = [req.query.lng, req.query.lat].map(parseFloat);
  const q = {
    location: {
      // $near is an operator inside of MongoDB that will allow us to search for stores
      // that are near a latitude and longitude
      $near: {
        $geometry: {
          type: 'Point',
          coordinates
        },
        $maxDistance: 10000 // 10km
      }

    }
  };

  // Use select to keep AJAX request slim (retrieve only what we need)
  // Accepts a space-separated list 'photo name'
  const stores = await Store.find(q).select('slug name description location photo').limit(10);
  res.json(stores);
};

exports.mapPage = (req, res) => {
  res.render('map', { title: 'Map' });
};

exports.heartStore = async (req, res) => {
  const hearts = req.user.hearts.map(obj => obj.toString());
  // $pull removes and $addToSet will add it, making sure it won't be added twice
  const operator = hearts.includes(req.params.id) ? '$pull' : '$addToSet';
  const user = await User
    .findByIdAndUpdate(
      req.user._id,
      { [operator]: { hearts: req.params.id } }, // use square bracket for variable [operator]
      { new: true } // Will return to us the updated user rather than the previous user
    );
  res.json(user);
};

exports.getHearts = async (req, res) => {
  const stores = await Store.find({
    _id: { $in: req.user.hearts } // $in will find any stores where their ID is in an array
  });
  res.render('hearts', { title: 'Hearts', stores });
};

exports.getTopStores = async (req, res) => {
  // When we want to do a complex query, we should do that on the model itself.
  // Anytime we would get to 7 - 8 lines in our query, we should do it on the model
  const stores = await Store.getTopStores();
  res.render('topStores', { stores, title: '⭐ Top Stores!' });
};
