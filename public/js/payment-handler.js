// public/js/payment-handler.js
// On page load, look for payment query params and notify the backend to persist the payment
(async function(){
  try {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('payment');
    const book = params.get('book');
    if (!status) return;
    if (status === 'success') {
      // notify backend
      await fetch('/api/payment/notify-payment', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId: book, action: 'payment' })
      });
      if (window.showToast) showToast('Payment successful. Thank you!', 'success');
      // remove query params from URL without reload
      const url = new URL(window.location.href);
      url.search = '';
      window.history.replaceState({}, document.title, url.toString());
    } else if (status === 'cancel') {
      if (window.showToast) showToast('Payment cancelled', 'info');
      const url = new URL(window.location.href);
      url.search = '';
      window.history.replaceState({}, document.title, url.toString());
    }
  } catch (e) { console.error('payment-handler error', e); }
})();
