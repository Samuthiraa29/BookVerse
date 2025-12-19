// models/User.js
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['admin', 'user'], default: 'user' },
  wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Book' }],
  cart: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Book' }],
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Book' }],
  history: [{
    action: String,
    book: { type: mongoose.Schema.Types.ObjectId, ref: 'Book' },
    date: { type: Date, default: Date.now },
    deleted: { type: Boolean, default: false }
  }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);
