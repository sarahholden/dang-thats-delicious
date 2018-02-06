const mongoose = require('mongoose');
const Review = mongoose.model('Review');

exports.addReview = async (req, res) => {
  // Set the author to the current user
  req.body.author = req.user._id;
  req.body.store = req.params.id;
  // req.body.store = req.
  // res.json(req.body);

  const review = await (new Review(req.body)).save();

  req.flash('success', 'Review Saved!');
  res.redirect('back');
};
