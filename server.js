// server.js
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const bodyParser = require('body-parser');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config();
const os = require('os');

const connectDB = require('./config/db');
connectDB();

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Sessions
app.use(session({
  secret: process.env.SESSION_SECRET || 'sess_secret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGO_URI, dbName: 'BookVerse' }),
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 // 1 day
  }
}));

// Prevent caching for protected pages (important for back-button after logout)
app.use((req, res, next) => {
  res.set('Cache-Control','no-store, no-cache, must-revalidate, private');
  next();
});

app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/user', require('./routes/user'));
app.use('/api/payment', require('./routes/payment'));

app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    res.clearCookie('connect.sid', { path: '/' });
    return res.redirect('/');
  });
});

// fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  // list local LAN IPv4 addresses (if any)
  const nets = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        addresses.push(net.address);
      }
    }
  }
  console.log(`Server started on ${PORT}`);
  console.log(`Open ${url} in your browser`);
  if (addresses.length) {
    console.log(`Or on your LAN: ${addresses.map(a => `http://${a}:${PORT}`).join(' , ')}`);
  }
});
