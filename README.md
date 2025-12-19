# BookVerse

BookVerse is a full-stack web application for book rental and purchase, built with Node.js, Express.js, MongoDB (via Mongoose), and front-end HTML/CSS/JavaScript. It provides a platform for users to discover, rent, or buy books, interact with a community through ratings and feedback, and manage their reading activities. Admins can oversee the platform, manage books, handle notifications, and view user data.

## Features

### User Authentication and Management
- User signup and login with secure password hashing (bcrypt).
- Session-based authentication using Express sessions stored in MongoDB.
- Role-based access control: 'user' and 'admin' roles.
- Session verification endpoint to check login status.
- Logout functionality with session destruction.

### Book Management
- **Public Access**: Browse books with details like title, author, description, price, rent price, cover image, ratings, and stock.
- **Personalized Views**: Logged-in users see flags for books in their wishlist, cart, or liked list.
- **Admin CRUD**: Admins can create, read, update, and delete books.

### User Interactions
- **Wishlist**: Add or remove books from a personal wishlist.
- **Cart**: Add or remove books for purchase/rental.
- **Likes**: Like or unlike books.
- **Ratings**: Rate books on a 1-5 star scale; average ratings are computed and displayed.
- **Feedback**: Submit feedback on books, which generates notifications for admins.
- **History**: Track user actions (e.g., wishlist/cart changes, likes, purchases/rentals). Users can soft-delete their history; admins can permanently delete user history.

### Admin Dashboard
- Manage books (full CRUD).
- View and manage notifications (mark as read, delete).
- View and reply to user feedback.
- List all users.
- View individual user history and delete it permanently.
- View payment-related notifications.

### Payment Processing
- Integration with Stripe for secure checkout sessions (supports buying or renting books).
- Mock payment options for local development/testing (when Stripe keys are not set).
- Payment success handling with notifications and history recording.
- Separate payment server (`payment-server.js`) for real-time UPI-like payments using WebSocket and public tunneling (via serveo.net).
- Webhook endpoint for Stripe events (basic implementation for production).

### Notifications and Feedback
- Notification system for admin alerts (e.g., new feedback, payment completions).
- Feedback system linking users to books with text comments and optional admin replies.

### Front-end Pages
- **Landing Page**: Hero section, features, about, and contact information.
- **Authentication**: Login and signup pages.
- **User Pages**: Dashboard, cart, wishlist, history.
- **Admin Pages**: Dashboard, manage books, view history.
- **Payment Pages**: Mock checkout pages for testing; UPI simulator for mobile payment simulation.

### Additional Features
- Static file serving for public assets.
- No-cache headers for protected pages to prevent back-button issues after logout.
- Database connection to MongoDB with environment-based configuration.
- LAN access logging for local network testing.
- Support for both buying and renting books with flexible pricing.

## Tech Stack
- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: Express sessions with MongoDB store, bcrypt for password hashing
- **Payments**: Stripe API, WebSocket for real-time payments
- **Front-end**: HTML, CSS, JavaScript (vanilla)
- **Other**: dotenv for environment variables, CORS, body-parser, nodemailer (for potential email features), localtunnel/ngrok for tunneling

## Installation

1. Clone the repository.
2. Copy `.env.example` to `.env` and set the required values (e.g., `MONGO_URI`, `SESSION_SECRET`, `STRIPE_SECRET_KEY` if using Stripe).
3. Run `npm install` to install dependencies.
4. Start the main server: `node server.js` (runs on port 3000 by default).
5. For payment testing, optionally run `node payment-server.js` (runs on port 4000) to enable real-time UPI simulation with tunneling.
6. Open `http://localhost:3000` in your browser.

## Usage

- **As a User**: Sign up, browse books, add to wishlist/cart, rate/feedback, purchase/rent via Stripe or mock checkout.
- **As an Admin**: Sign up with role 'admin', access admin dashboard to manage books, view notifications/feedback/users, handle payments.
- **Testing Payments**: Use mock checkout pages or the UPI simulator for local testing without real payments.

## API Endpoints

### Authentication (`/api/auth`)
- `POST /signup`: Register a new user.
- `POST /login`: Authenticate user.
- `GET /me`: Check session status.

### User (`/api/user`)
- `GET /books`: Get all books (with personalization for logged-in users).
- `POST /wishlist/:bookId`: Add/remove from wishlist (action: 'add'/'remove').
- `POST /cart/:bookId`: Add/remove from cart (action: 'add'/'remove').
- `POST /like/:bookId`: Like/unlike a book (action: 'like'/'unlike').
- `POST /rate/:bookId`: Rate a book (score: 0-5).
- `POST /feedback/:bookId`: Submit feedback.
- `GET /history`: Get user history.
- `DELETE /history`: Soft-delete user history.

### Admin (`/api/admin`)
- `GET /books`, `POST /books`, `PUT /books/:id`, `DELETE /books/:id`: Book CRUD.
- `GET /notifications`, `POST /notifications/mark-read`, `DELETE /notifications/:id`: Notification management.
- `GET /feedbacks`, `DELETE /feedbacks/:id`, `POST /feedbacks/:id/reply`: Feedback management.
- `GET /users`: List users.
- `GET /history/:userId`, `DELETE /history/:userId`: User history management.
- `GET /payments`: View payment notifications.

### Payment (`/api/payment`)
- `POST /create-checkout-session`: Create Stripe checkout session.
- `POST /webhook`: Handle Stripe webhooks.
- `POST /success`: Record payment success.

### Payment Server (Separate, port 4000)
- `GET /api/get-public-url`: Get public tunnel URL.
- `GET /api/get-ws-url`: Get WebSocket URL.
- `POST /api/confirm-payment`: Confirm payment via WebSocket.

## Contributing
Contributions are welcome. Please ensure code follows the existing structure and includes appropriate error handling.

## License
ISC License.
