// routes/payment.js
const express = require('express');
const router = express.Router();
let stripe;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
} else {
  console.warn('STRIPE_SECRET_KEY not set; payment routes will return 501 if used');
  // stub that throws when methods are called
  stripe = null;
}
const Notification = require('../models/Notification');
const Book = require('../models/Book');
const User = require('../models/User');

// create checkout session for a single book purchase/rent
router.post('/create-checkout-session', async (req,res) => {
  try {
    const { bookId, mode } = req.body; // mode: 'buy' or 'rent'
    const book = await Book.findById(bookId);
    if (!book) return res.status(404).json({ error: 'Book not found' });

    const amount = Math.round(((mode === 'rent') ? (book.rentPrice || Math.round(book.price/4)) : book.price) * 100); // cents

  if (!stripe) {
    // Return a mock checkout URL so local testing can proceed without Stripe keys.
    const mockUrl = `${req.headers.origin}/mock_checkout_detailed.html?book=${bookId}&mode=${mode}`;
    return res.json({ id: 'mock_session', url: mockUrl, warning: 'Using mock checkout (STRIPE_SECRET_KEY not set)' });
  }
  const session = await stripe.checkout.sessions.create({
      customer_email: req.session.user ? req.session.user.email : undefined,
      payment_method_types: [
        'card',
        'alipay',
        'wechat_pay',
        'klarna',
        'afterpay_clearpay'
      ],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { 
            name: book.title,
            description: book.description || undefined,
            images: book.coverImage ? [book.coverImage] : undefined
          },
          unit_amount: amount
        },
        quantity: 1
      }],
      mode: 'payment',
      success_url: `${req.headers.origin}/user/user_dashboard.html?payment=success&book=${bookId}`,
      cancel_url: `${req.headers.origin}/user/user_dashboard.html?payment=cancel`,
      metadata: { bookId: String(bookId), mode }
    });

    return res.json({ id: session.id, url: session.url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Payment create failed' });
  }
});

// webhook endpoint (optional): to receive Stripe webhook events and mark payments and notify admin
// NOTE: Configure webhook in Stripe dashboard and set STRIPE_WEBHOOK_SECRET if you want this
router.post('/webhook', express.raw({ type: 'application/json' }), async (req,res) => {
  // For brevity, webhook verification omitted in this example.
  // In production, verify with stripe.webhooks.constructEvent
  const event = req.body;
  // Handle events...
  res.json({ received: true });
});

// fallback route to persist payment notification from frontend after success
router.post('/success', async (req,res) => {
  try {
    const { bookId, mode, days } = req.body; // mode: 'buy' or 'rent', days is optional
    const book = await Book.findById(bookId);
    let message = `User ${req.session.user ? req.session.user.email : 'guest'} completed a '${mode}' transaction for book: ${book?.title || bookId}`;
    
    let historyAction = { action: mode, book: bookId };
    if (mode === 'rent' && days) {
      const returnDate = new Date();
      returnDate.setDate(returnDate.getDate() + parseInt(days, 10));
      message += `. Return date is ${returnDate.toLocaleDateString()}.`;
      historyAction.returnDate = returnDate;
    }

    await Notification.create({ message, user: req.session.user ? req.session.user.id : null, book: bookId, type: 'payment' });
    // optionally record into user history
    if (req.session.user) {
      const user = await User.findById(req.session.user.id);
      user.history.push(historyAction);
      await user.save();
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('Error in payment success notification:', err);
    res.status(500).json({ ok: false, error: 'Failed to record payment notification.' });
  }
});

module.exports = router;
