// routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');

function sendUserSession(req, user) {
  req.session.user = {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role
  };
}

// signup
router.post('/signup', async (req, res) => {
  try {
  const { name, email, password } = req.body;
  if(!name || !email || !password) return res.status(400).json({ error: 'Missing fields' });
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ error: 'Email already registered' });
    const hash = await bcrypt.hash(password, 10);
  // role is always 'user' when signing up through the public UI
  const user = new User({ name, email, passwordHash: hash, role: 'user' });
    await user.save();
    sendUserSession(req, user);
    return res.json({ ok: true, role: user.role });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// login
router.post('/login', async (req,res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Missing email or password' });
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });
    // support possible legacy field name `password` or current `passwordHash`
    const hash = user.passwordHash || user.password;
    if (!hash) {
      console.error('User has no password hash:', user._id);
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    const match = await bcrypt.compare(password, hash);
    if (!match) return res.status(400).json({ error: 'Invalid credentials' });
    sendUserSession(req, user);
    return res.json({ ok: true, role: user.role });
  } catch(err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// check session
router.get('/me', (req, res) => {
  if (req.session.user) return res.json({ user: req.session.user });
  return res.status(401).json({ error: 'Not logged in' });
});

module.exports = router;
