// 1. First import express
const express = require('express');
// 2. Grab the router off of Express
const router = express.Router();
// 2b. Import all of our controllers
const storeController = require('../controllers/storeController');
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');
const reviewController = require('../controllers/reviewController');

// Async error handling using object destructuring
const { catchErrors } = require('../handlers/errorHandlers');

// 3. Define all of your routes
router.get('/', catchErrors(storeController.getStores));
router.get('/stores', catchErrors(storeController.getStores));
router.get('/stores/page/:page', catchErrors(storeController.getStores));
// Use the authController middleware to make sure that users are logged in before adding
router.get('/add', authController.isLoggedIn, storeController.addStore);
router.post('/add',
  storeController.upload,
  catchErrors(storeController.resize),
  catchErrors(storeController.createStore)
);

router.post('/add/:id',
  storeController.upload,
  catchErrors(storeController.resize),
  catchErrors(storeController.updateStore)
);

router.get('/store/:slug', catchErrors(storeController.getStoreBySlug));
router.get('/stores/:id/edit', catchErrors(storeController.editStore));

router.get('/tags', catchErrors(storeController.getStoresByTag));
router.get('/tags/:tag', catchErrors(storeController.getStoresByTag));

router.get('/hearts', authController.isLoggedIn, catchErrors(storeController.getHearts));

router.post('/reviews/:id', authController.isLoggedIn, catchErrors(reviewController.addReview));

router.get('/top', catchErrors(storeController.getTopStores))

router.get('/register', userController.registerForm);
router.post(
  '/register',
  userController.validateRegister, // R1. Validate the registration data
  userController.register, // R2. Register the user
  authController.login// R3. Log the user in
);

router.get('/login', userController.loginForm);
router.post('/login', authController.login);

router.get('/logout', authController.logout);

router.get('/account', authController.isLoggedIn, userController.account);
// Wrap things in catchErrors when they use async / await
router.post('/account', catchErrors(userController.updateAccount));
router.post('/account/forgot', catchErrors(authController.forgot));
router.get('/account/reset/:token', catchErrors(authController.reset));
router.post('/account/reset/:token',
  authController.confirmedPasswords,
  catchErrors(authController.update)
);
router.get('/map', storeController.mapPage);

/* -------------------------------------------
API
---------------------------------------------- */
// Can create versions if others are depending on the API by adding /v1/ /v2, etc.
// router.get('/api/v1/search')
router.get('/api/search', catchErrors(storeController.searchStores));
router.get('/api/stores/near', catchErrors(storeController.mapStores));
router.post('/api/stores/:id/heart', catchErrors(storeController.heartStore));

// 4. Export routes (see app.js for where they are used)
module.exports = router;


// NOTES
// A. Get the url ('/' in this example)
// B. Provide a callback function that will run when the url is hit
// C. [req -> info that is coming in] [res -> object with data coming back to the user]
// router.get('/', (req, res) => {
// Note: can only send data ONCE

// 1. Can send something back, like a message using res.send()
// res.send('Hey! It works!');

// 2. Can send JSON back using res.json()
// const sarah = { name: 'Sarah', age: 32, cool: 'obviously' };
// res.json(sarah);

// 3. Can get data from URL
// URL example: http://localhost:7777/?name=sarah&age=100
// A. Get a specific parameter using res.send(req.query.parameterToGetFromUrl)
// res.send(req.query.name);
// B. Send back a JSON object with data from URL
// (See bodyParser in app.js which is required to make this work)
// res.json(req.query);

// 4. Render a template (see pug lines in app.js)
// A. 'hello' -> name of file to render (location for templates is specified in app.js)
// B. Can also provide an object with data for template
// res.render('hello', {
//   name: req.query.name,
//   title: 'I love food'
// });
// });
