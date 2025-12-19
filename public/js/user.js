// public/js/user.js
async function getJSON(url){ return (await fetch(url)).json(); }
async function postJSON(url,data){ return (await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)})).json(); }
let me = {};

document.addEventListener('DOMContentLoaded', async ()=> {
  try {
    const meRes = await (await fetch('/api/auth/me')).json();
    me = meRes;
    if (!me.user) { location.href = '/login.html'; return; }
  } catch(e) { location.href = '/login.html'; return; }

  // Check for payment status from URL and notify backend
  const params = new URLSearchParams(window.location.search);
  if (params.get('payment') === 'success' && params.get('book')) {
    showToast('Payment successful!', 'success');
    // Notify backend about the successful transaction
    await postJSON('/api/payment/success', {
      bookId: params.get('book'),
      mode: params.get('mode') || 'buy' // 'buy' or 'rent'
    });
    // Clean up URL
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  // Reusable function to render a book card
  function renderBookCard(b, context = 'browse') {
    const c = document.createElement('div');
    c.className = 'book-card';
    // build stars HTML safely
    let starsHtml = '';
    // determine current logged-in user id if available
    const userId = (typeof me !== 'undefined' && me.user) ? String(me.user.id) : null;
    const ratings = b.ratings || [];
    // find user's current score for this book
    const userRatingObj = ratings.find(r => String(r.user) === userId);
    const userScore = userRatingObj ? userRatingObj.score : 0;
    for (let i=1;i<=5;i++){
      const filled = (userScore >= i) ? 'filled' : '';
      starsHtml += `<span class="star ${filled}" data-score="${i}">&#9733;</span>`;
    }
    const avgText = (ratings.length) ? ((ratings.reduce((s,r)=>s+r.score,0)/ratings.length).toFixed(1)) : '0.0';

    let actionsHtml = '';
    if (context === 'cart') {
      actionsHtml = `
        <button data-buy="${b._id}" class="btn">Buy</button>
        <button data-rent="${b._id}" class="btn ghost">Rent</button>
        <button data-cart="${b._id}" class="btn ghost">Remove</button>
      `;
    } else if (context === 'wishlist') {
      actionsHtml = `<button data-wish="${b._id}" class="btn ghost">Remove from Wishlist</button>`;
    } else {
      // Default 'browse' context
      actionsHtml = `
        <button data-like="${b._id}" class="btn ghost icon-btn ${b.liked ? 'active' : ''}" title="${b.liked ? 'Unlike' : 'Like'}">&#128077;</button>
        <button data-wish="${b._id}" class="btn ghost ${b.inWishlist ? 'active' : ''}">${b.inWishlist ? 'Remove Wishlist' : 'Wishlist'}</button>
        <button data-cart="${b._id}" class="btn ${b.inCart ? 'active' : ''}">${b.inCart ? 'Remove from Cart' : 'Add to Cart'}</button>
        <button data-feedback="${b._id}" class="btn ghost">Feedback</button>
        <button data-buy="${b._id}" class="btn">Buy</button>
        <button data-rent="${b._id}" class="btn ghost">Rent</button>`;
    }

    c.innerHTML = `<img src="${b.coverImage || '/img-placeholder.png'}" />
      <strong>${b.title}</strong>
      <div>${b.author || ''}</div>
      <div>$${b.price || 0}</div>
      <div class="rating" data-book="${b._id}" data-user-score="${userScore}">
        ${starsHtml}<small class="avg">${avgText}</small>
      </div>
      <div class="book-actions">${actionsHtml}</div>`;
    return c;
  }

  // Main book browser logic
  const booksGrid = document.getElementById('booksGrid');
  if (booksGrid) {
    const books = await getJSON('/api/user/books');
    booksGrid.innerHTML = '';
    books.forEach(b => {
      booksGrid.appendChild(renderBookCard(b));
    });
  }

  // Cart page logic
  const cartGrid = document.getElementById('cartGrid');
  if (cartGrid) {
    const books = await getJSON('/api/user/books');
    const cartBooks = books.filter(b => b.inCart);
    cartGrid.innerHTML = '';
    if (cartBooks.length) {
      cartBooks.forEach(b => {
        const card = renderBookCard(b, 'cart');
        cartGrid.appendChild(card);
      });
    } else {
      cartGrid.innerHTML = '<p>Your cart is empty.</p>';
    }
  }

  // Wishlist page logic
  const wishlistGrid = document.getElementById('wishlistGrid');
  if (wishlistGrid) {
    const books = await getJSON('/api/user/books');
    const wishlistBooks = books.filter(b => b.inWishlist);
    wishlistGrid.innerHTML = '';
    if (wishlistBooks.length) {
      wishlistBooks.forEach(b => {
        const card = renderBookCard(b, 'wishlist');
        wishlistGrid.appendChild(card);
      });
    } else {
      wishlistGrid.innerHTML = '<p>Your wishlist is empty.</p>';
    }
  }

  // Use event delegation on the body to handle all clicks
  document.body.addEventListener('click', async (e) => {
    const like = e.target.dataset.like;
    const wish = e.target.dataset.wish;
    const cart = e.target.dataset.cart;
    const buy = e.target.dataset.buy;
    const rent = e.target.dataset.rent;

    // Handle removal from cart/wishlist pages
    if (cart && cartGrid) {
      // This is a remove click from the cart page
      await postJSON('/api/user/cart/' + cart, { action: 'remove' });
      location.reload();
    }
    if (wish && wishlistGrid) {
      // This is a remove click from the wishlist page
      await postJSON('/api/user/wishlist/' + wish, { action: 'remove' });
      location.reload();
    }

    // Like toggle
    if (like) {
      const currentlyLiked = e.target.classList.contains('active');
      const action = currentlyLiked ? 'unlike' : 'like';
      const res = await postJSON('/api/user/like/' + like, { action });
      if (res && res.likes) {
        const has = res.likes.map(x => String(x)).includes(String(like));
        e.target.classList.toggle('active', has); // The CSS will handle the visual change
        e.target.title = has ? 'Unlike' : 'Like'; // Update tooltip
        showToast(has ? 'Liked' : 'Unliked', has ? 'success' : 'info');
      } else showToast('Like failed', 'error');
    }

    // Feedback
    if (e.target.dataset.feedback) {
      const fid = e.target.dataset.feedback;
      const text = prompt('Enter your feedback or comment for this book:');
      if (!text) { showToast('Feedback cancelled', 'info'); return; }
      const res = await postJSON('/api/user/feedback/' + fid, { text });
      if (res && res._id) showToast('Feedback submitted', 'success');
      else showToast('Feedback failed', 'error');
    }
    // Rating (stars)
    if (e.target.classList.contains('star')) {
      const score = parseInt(e.target.dataset.score, 10);
      const ratingEl = e.target.closest('.rating');
      const bookId = ratingEl.dataset.book;
      const current = parseInt(ratingEl.dataset.userScore || 0, 10);
      // if user clicks the same score again, remove rating (send score:0)
      const sendScore = (current === score) ? 0 : score;
      const res = await postJSON('/api/user/rate/' + bookId, { score: sendScore });
      if (res && res.ok) {
        // update stars and avg
        const ratingEl2 = document.querySelector(`.rating[data-book='${bookId}']`);
        if (ratingEl) {
          const stars = ratingEl2.querySelectorAll('.star');
          stars.forEach(s=> s.classList.toggle('filled', parseInt(s.dataset.score,10) <= (sendScore || 0)));
          const avgEl = ratingEl2.querySelector('.avg');
          if (avgEl) avgEl.textContent = res.avg.toFixed(1);
          // update dataset user-score
          ratingEl2.dataset.userScore = sendScore;
        }
        showToast('Thanks for rating', 'success');
      } else showToast('Rating failed', 'error');
    }

    // Wishlist toggle
    if (wish) {
      const currently = e.target.classList.contains('active');
      const action = currently ? 'remove' : 'add';
      const res = await postJSON('/api/user/wishlist/' + wish, { action });
      if (res && res.wishlist) {
        const has = res.wishlist.map(x => String(x)).includes(String(wish));
        e.target.classList.toggle('active', has);
        e.target.textContent = has ? 'Remove Wishlist' : 'Wishlist';
        showToast(has ? 'Added to wishlist' : 'Removed from wishlist', 'success');
      } else showToast('Wishlist failed', 'error');
    }

    // Cart toggle
    if (cart) {
      const currently = e.target.classList.contains('active');
      const action = currently ? 'remove' : 'add';
      const res = await postJSON('/api/user/cart/' + cart, { action });
      if (res && res.cart) {
        const has = res.cart.map(x => String(x)).includes(String(cart));
        e.target.classList.toggle('active', has);
        e.target.textContent = has ? 'Remove from Cart' : 'Add to Cart';
        showToast(has ? 'Added to cart' : 'Removed from cart', 'success');
      } else showToast('Cart failed', 'error');
    }
    if (buy || rent) {
      const btn = e.target;
      const originalText = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Processing...';

      // call backend to create stripe session
      const mode = buy ? 'buy' : 'rent';
      const payload = { bookId: buy || rent, mode };
      try {
        const create = await postJSON('/api/payment/create-checkout-session', payload);
        if (create && create.url) {
          // optionally notify admin after successful payment; here redirect
          window.location.href = create.url;
        } else {
          showToast(create && create.error ? create.error : 'Payment init failed', 'error');
          btn.disabled = false;
          btn.textContent = originalText;
        }
      } catch (err) {
        showToast('Payment initiation failed.', 'error');
        btn.disabled = false;
        btn.textContent = originalText;
      }
    }
  });
});
