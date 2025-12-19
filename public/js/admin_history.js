// public/js/admin_history.js
async function getJSON(url){ return (await fetch(url)).json(); }

document.addEventListener('DOMContentLoaded', async () => {
  const userSelector = document.getElementById('userSelector');
  const historyList = document.getElementById('historyList');
  const deleteHistoryBtn = document.getElementById('deleteHistoryBtn');
  let selectedUserId = null;

  // Populate user dropdown
  try {
    const users = await getJSON('/api/admin/users');
    users.filter(u => u.role !== 'admin').forEach(user => {
      const option = document.createElement('option');
      option.value = user._id;
      option.textContent = user.name || user.email;
      userSelector.appendChild(option);
    });
  } catch (error) {
    console.error('Failed to load users:', error);
    historyList.innerHTML = '<p class="error">Could not load users.</p>';
  }

  // Function to load history for a selected user
  async function loadHistory(userId) {
    selectedUserId = userId;
    if (!userId) {
      historyList.innerHTML = '<p>Please select a user to view their history.</p>';
      deleteHistoryBtn.style.display = 'none';
      return;
    }
    try {
      const history = await getJSON(`/api/admin/history/${userId}`);
      if (history.length) {
        historyList.innerHTML = history.map(h => `
          <div class="history-item ${h.deleted ? 'deleted' : ''}">
            <div class="history-action"><strong>Action:</strong> ${h.action.replace('_', ' ')} | <strong>Book:</strong> ${h.book?.title || 'N/A'} ${h.deleted ? '<span class="deleted-tag">DELETED BY USER</span>' : ''}</div>
            <div class="history-date">${new Date(h.timestamp).toLocaleString()}</div>
          </div>
        `).join('');
        deleteHistoryBtn.style.display = 'inline-block';
      } else {
        historyList.innerHTML = '<p>This user has no history.</p>';
        deleteHistoryBtn.style.display = 'none';
      }
    } catch (error) {
      console.error('Failed to load history:', error);
      historyList.innerHTML = '<p class="error">Could not load history for this user.</p>';
    }
  }

  // Event Listeners
  userSelector.addEventListener('change', (e) => loadHistory(e.target.value));

  deleteHistoryBtn.addEventListener('click', async () => {
    if (!selectedUserId || !confirm('Are you sure you want to permanently delete this user\'s history? This cannot be undone.')) {
      return;
    }
    try {
      await fetch(`/api/admin/history/${selectedUserId}`, { method: 'DELETE' });
      // You might want to add a success toast here
      loadHistory(selectedUserId); // Refresh the list
    } catch (error) {
      console.error('Failed to delete history:', error);
      // You might want to add an error toast here
    }
  });
});