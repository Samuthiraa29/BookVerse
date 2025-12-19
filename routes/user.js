// routes/user.js
const express = require('express');
const router = express.Router();
const Book = require('../models/Book');
const User = require('../models/User');
const Feedback = require('../models/Feedback');
const Notification = require('../models/Notification');

// middleware
function isUser(req,res,next){
  if (!req.session.user) return res.status(401).json({ error: 'Login please' });
  next();
}

// get books (public)
router.get('/books', async (req,res) => {
  const books = await Book.find({}).lean();
  // if user is logged in, mark which books are liked / in wishlist / in cart
  if (req.session && req.session.user) {
    const user = await User.findById(req.session.user.id).lean();
    const wishlist = (user && user.wishlist) ? user.wishlist.map(String) : [];
    const cart = (user && user.cart) ? user.cart.map(String) : [];
    const likes = (user && user.likes) ? user.likes.map(String) : [];
    const out = books.map(b => ({
      ...b,
      liked: likes.includes(String(b._id)),
      inWishlist: wishlist.includes(String(b._id)),
      inCart: cart.includes(String(b._id))
    }));
    return res.json(out);
  }
  res.json(books);
});

// wishlist add/remove
router.post('/wishlist/:bookId', isUser, async (req,res) => {
  const uid = req.session.user.id;
  const { action } = req.body; // add or remove
  const user = await User.findById(uid);
  if (action === 'add') {
    if (!user.wishlist.includes(req.params.bookId)) user.wishlist.push(req.params.bookId);
    user.history.push({ action: 'wishlist_add', book: req.params.bookId });
  } else {
    user.wishlist = user.wishlist.filter(b => b.toString() !== req.params.bookId);
    user.history.push({ action: 'wishlist_remove', book: req.params.bookId });
  }
  await user.save();
  res.json(user);
});

// cart add/remove
router.post('/cart/:bookId', isUser, async (req,res) => {
  const uid = req.session.user.id;
  const { action } = req.body;
  const user = await User.findById(uid);
  if (action === 'add') {
    if (!user.cart.includes(req.params.bookId)) user.cart.push(req.params.bookId);
    user.history.push({ action: 'cart_add', book: req.params.bookId });
  } else {
    user.cart = user.cart.filter(b => b.toString() !== req.params.bookId);
    user.history.push({ action: 'cart_remove', book: req.params.bookId });
  }
  await user.save();
  res.json(user);
});

// like/unlike
router.post('/like/:bookId', isUser, async (req,res)=> {
  const uid = req.session.user.id;
  const { action } = req.body;
  const user = await User.findById(uid);
  if (action === 'like') {
    if (!user.likes.includes(req.params.bookId)) user.likes.push(req.params.bookId);
    user.history.push({ action: 'like', book: req.params.bookId });
  } else {
    user.likes = user.likes.filter(b => b.toString() !== req.params.bookId);
    user.history.push({ action: 'unlike', book: req.params.bookId });
  }
  await user.save();
  res.json(user);
});

// rate a book (add or update user's rating)
router.post('/rate/:bookId', isUser, async (req,res) => {
  const uid = req.session.user.id;
  const { score } = req.body; // expected 1-5
  // allow score 0 to remove an existing rating
  if (score === undefined || score === null || score < 0 || score > 5) return res.status(400).json({ error: 'Invalid score' });
  const book = await Book.findById(req.params.bookId);
  if (!book) return res.status(404).json({ error: 'Book not found' });
  // check if user already rated
  book.ratings = book.ratings || [];
  const existingIndex = book.ratings.findIndex(r => String(r.user) === String(uid));
  if (score === 0) {
    // remove existing rating
    if (existingIndex !== -1) book.ratings.splice(existingIndex, 1);
  } else {
    if (existingIndex !== -1) book.ratings[existingIndex].score = score;
    else book.ratings.push({ user: uid, score });
  }
  await book.save();
  // compute average
  const avg = book.ratings.length ? (book.ratings.reduce((s,r)=>s+r.score,0) / book.ratings.length) : 0;
  res.json({ ok:true, avg, ratings: book.ratings });
});

// feedback
router.post('/feedback/:bookId', isUser, async (req,res)=> {
  const uid = req.session.user.id;
  const fb = new Feedback({ user: uid, book: req.params.bookId, text: req.body.text });
  await fb.save();
  // create notification for admin
  await Notification.create({ message: `New feedback from ${req.session.user.email}`, user: uid });
  res.json(fb);
});

// history
router.get('/history', isUser, async (req,res)=> {
  const user = await User.findById(req.session.user.id).populate('history.book').lean();
  // Only return history items that are not marked as deleted by the user
  const visibleHistory = user.history.filter(h => !h.deleted);
  res.json(visibleHistory);
});

// User soft-deletes their own history
router.delete('/history', isUser, async (req, res) => {
  const user = await User.findById(req.session.user.id);
  user.history.forEach(h => h.deleted = true);
  await user.save();
  res.json({ ok: true, message: 'History cleared' });
});

module.exports = router;
