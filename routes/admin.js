// routes/admin.js
const express = require('express');
const router = express.Router();
const Book = require('../models/Book');
const Notification = require('../models/Notification');
const Feedback = require('../models/Feedback');
const User = require('../models/User');

// middleware
function isAdmin(req,res,next){
  if (!req.session.user) return res.status(401).json({ error: 'Login please' });
  if (req.session.user.role !== 'admin') return res.status(403).json({ error: 'Admins only' });
  next();
}

// Books CRUD
router.get('/books', isAdmin, async (req,res)=> {
  const books = await Book.find({});
  res.json(books);
});
router.post('/books', isAdmin, async (req,res)=> {
  const b = new Book(req.body);
  await b.save();
  res.json(b);
});
router.put('/books/:id', isAdmin, async (req,res)=> {
  const book = await Book.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(book);
});
router.delete('/books/:id', isAdmin, async (req,res)=> {
  await Book.findByIdAndDelete(req.params.id);
  res.json({ ok:true });
});

// Notifications
router.get('/notifications', isAdmin, async (req,res)=> {
  // if ?status=unread is passed, only return unread notifications
  const query = req.query.status === 'unread' ? { read: { $ne: true } } : {};
  const notifications = await Notification.find(query).sort({ createdAt: -1 });
  res.json(notifications);
});

// Mark all notifications as read
router.post('/notifications/mark-read', isAdmin, async (req, res) => {
  await Notification.updateMany({ read: { $ne: true } }, { $set: { read: true } });
  res.json({ ok: true });
});


router.delete('/notifications/:id', isAdmin, async (req,res)=> {
  await Notification.findByIdAndDelete(req.params.id);
  res.json({ ok:true });
});

// Feedback
router.get('/feedbacks', isAdmin, async (req,res)=> {
  const f = await Feedback.find({}).populate('user').populate('book');
  res.json(f);
});
router.delete('/feedbacks/:id', isAdmin, async (req,res)=> {
  await Feedback.findByIdAndDelete(req.params.id);
  res.json({ ok:true });
});
router.post('/feedbacks/:id/reply', isAdmin, async (req,res)=> {
  const { reply } = req.body;
  const fb = await Feedback.findById(req.params.id);
  if (!fb) return res.status(404).json({ error: 'Not found' });
  fb.reply = reply;
  await fb.save();
  res.json(fb);
});

// Users list
router.get('/users', isAdmin, async (req,res)=> {
  const u = await User.find({}).select('-passwordHash');
  res.json(u);
});

// Get history for a specific user
router.get('/history/:userId', isAdmin, async (req, res) => {
  const user = await User.findById(req.params.userId).populate('history.book');
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user.history);
});

// Admin permanently deletes a user's history
router.delete('/history/:userId', isAdmin, async (req, res) => {
  const user = await User.findById(req.params.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  user.history = []; // Clear the history array
  await user.save();
  res.json({ ok: true, message: 'User history permanently deleted' });
});
// payments list: stub example (payments may be saved into DB by /payment route)
router.get('/payments', isAdmin, async (req,res) => {
  // You can implement a Payment model to persist payments. For now return notifications of type payment
  const payments = await Notification.find({ message: /payment|order|rent/i }).sort({ createdAt: -1 });
  res.json(payments);
});

module.exports = router;
