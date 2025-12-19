document.addEventListener('DOMContentLoaded', async () => {
  let me;
  try {
    me = await (await fetch('/api/auth/me')).json();
    if (!me.user) { location.href = '/login.html'; return; }
  } catch(e) {
    location.href = '/login.html';
    return;
  }

  const historyList = document.getElementById('historyList');
  const deleteBtn = document.getElementById('deleteHistoryBtn');

  async function loadHistory() {
    historyList.innerHTML = 'Loading history...';
    const history = await (await fetch('/api/user/history')).json();
    if (history.length === 0) {
      historyList.innerHTML = '<p>No activity recorded yet.</p>';
      deleteBtn.style.display = 'none';
      return;
    }

    deleteBtn.style.display = 'inline-block';
    const historyHtml = history.reverse().map(item => {
      const actionText = item.action.replace(/_/g, ' ');
      const bookTitle = item.book ? ` for <strong>${item.book.title}</strong>` : '';
      return `<div class="history-item">
        <div class="history-action">You ${actionText}${bookTitle}.</div>
        <div class="history-date">${new Date(item.date).toLocaleString()}</div>
      </div>`;
    }).join('');
    historyList.innerHTML = historyHtml;
  }

  deleteBtn.addEventListener('click', async () => {
    if (!confirm('Are you sure you want to clear your history? This cannot be undone.')) {
      return;
    }
    try {
      const res = await fetch('/api/user/history', { method: 'DELETE' });
      if (res.ok) {
        // Using a global toast function if available
        if (window.showToast) showToast('Your history has been cleared.', 'success');
        loadHistory();
      } else {
        if (window.showToast) showToast('Failed to clear history.', 'error');
      }
    } catch (err) {
      if (window.showToast) showToast('An error occurred.', 'error');
    }
  });

  loadHistory();
});