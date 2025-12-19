// public/js/admin.js
async function getJSON(url){ return (await fetch(url)).json(); }
async function postJSON(url, data){ return (await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)})).json(); }

document.addEventListener('DOMContentLoaded', async () => {
  // quick session check
  try {
    const me = await (await fetch('/api/auth/me')).json();
    if (!me.user || me.user.role !== 'admin') {
      showToast('Admins only. Login please', 'error');
      location.href = '/login.html';
      return;
    }
  } catch(e) {
    location.href = '/login.html';
    return;
  }

  // Function to refresh dashboard card counts
  async function refreshDashboardCounts() {
    const totalBooksEl = document.getElementById('totalBooks');
    // Only run if we are on a page with dashboard cards
    if (!totalBooksEl) return;
    try {
      const books = await getJSON('/api/admin/books');
      const users = await getJSON('/api/admin/users');
      const notifs = await getJSON(`/api/admin/notifications?status=unread&_=${new Date().getTime()}`);
      totalBooksEl.innerText = books.length;
      document.getElementById('totalUsers').innerText = users.length;
      document.getElementById('totalNotifs').innerText = notifs.length;
    } catch (err) { console.error('Failed to refresh dashboard counts', err); }
  }

  // admin dashboard actions: show notifications, feedback, users in manageArea
  const manageArea = document.getElementById('manageArea');
  const navNot = document.getElementById('nav-notifications');
  const navFb = document.getElementById('nav-feedback');
  const navUsers = document.getElementById('nav-users');

  async function loadNotifications(){
    const n = await getJSON('/api/admin/notifications');
    manageArea.innerHTML = '<h2>Notifications</h2>' + (n.length ? n.map(x=>`<div class="card notification-item ${x.read ? 'read' : ''}" data-id="${x._id}"><div class="card-content">${x.message}</div><small>${new Date(x.createdAt).toLocaleString()}</small><div class="card-actions"><button class="btn small del-notif" data-id="${x._id}">Delete</button></div></div>`).join('') : '<p>No notifications</p>');
    // Mark all as read on view
    await postJSON('/api/admin/notifications/mark-read', {});
    // Re-fetch and update dashboard count
    const notifCountEl = document.getElementById('totalNotifs');
    if (notifCountEl) {
      const updatedUnreadNotifs = await getJSON(`/api/admin/notifications?status=unread&_=${new Date().getTime()}`);
      notifCountEl.innerText = updatedUnreadNotifs.length;
    }

    // attach delete handlers
    manageArea.querySelectorAll('.del-notif').forEach(btn=> btn.addEventListener('click', async (e)=>{
      const id = e.target.dataset.id;
      if (!confirm('Delete this notification?')) return;
      await fetch('/api/admin/notifications/' + id, { method: 'DELETE' });
      showToast('Notification deleted', 'success');
      loadNotifications();
    }));
  }

  async function loadFeedback(){
    const f = await getJSON('/api/admin/feedbacks');
    manageArea.innerHTML = '<h2>Feedback</h2>' + (f.length ? f.map(x=>`<div class="card feedback-item" data-id="${x._id}"><div class="card-content"><strong>From: ${x.user?.email||'Anonymous'}</strong><p>${x.text}</p><small>Book: ${x.book?.title||'N/A'}</small></div><small>${new Date(x.createdAt).toLocaleString()}</small><div class="card-actions"><button class="btn small del-fb" data-id="${x._id}">Delete</button></div></div>`).join('') : '<p>No feedback</p>');
    manageArea.querySelectorAll('.del-fb').forEach(btn=> btn.addEventListener('click', async (e)=>{
      const id = e.target.dataset.id;
      if (!confirm('Delete this feedback?')) return;
      await fetch('/api/admin/feedbacks/' + id, { method: 'DELETE' });
      showToast('Feedback deleted', 'success');
      loadFeedback();
    }));
  }

  async function loadUsers(){
    const u = await getJSON('/api/admin/users');
    manageArea.innerHTML = '<h2>Users</h2>' + (u.length ? u.map(x=>`<div class="card user-item"><div><strong>${x.name||x.email}</strong><br><small>${x.email}</small></div><div class="user-role">${x.role}</div></div>`).join('') : '<p>No users</p>');
  }

  navNot && navNot.addEventListener('click', (e)=>{ e.preventDefault(); loadNotifications(); });
  navFb && navFb.addEventListener('click', (e)=>{ e.preventDefault(); loadFeedback(); });
  navUsers && navUsers.addEventListener('click', (e)=>{ e.preventDefault(); loadUsers(); });


  // manage books page logic
  const listWrap = document.getElementById('booksList');
  const addBtn = document.getElementById('addBookBtn');

  if (listWrap) {
    const modal = document.getElementById('bookFormWrap');
    const form = document.getElementById('bookForm');
    let editId = null;

    async function loadBooks(){
      const books = await getJSON('/api/admin/books');
      listWrap.innerHTML = '';
      books.forEach(b => {
        const div = document.createElement('div');
        div.className = 'book-card';
        div.innerHTML = `<img src="${b.coverImage || '/img-placeholder.png'}"/><strong>${b.title}</strong><div>${b.author || ''}</div><div>$${b.price||0}</div>
          <div class="book-actions">
            <button class="btn" data-edit="${b._id}">Edit</button>
            <button class="btn ghost" data-del="${b._id}">Delete</button>
          </div></div>`;
        listWrap.appendChild(div);
      });

      // Event Delegation for book actions
      listWrap.addEventListener('click', async (e) => {
        const target = e.target;
        const delId = target.dataset.del;
        const viewId = target.dataset.view;

        if (target.dataset.del) {
          if (!confirm('Delete this book?')) return;
          await fetch('/api/admin/books/' + delId, { method: 'DELETE' });
          showToast('Book deleted', 'success');
          loadBooks();
        } else if (target.dataset.view) {
          e.stopPropagation(); // Prevent click from bubbling up
          window.open(`/book_details.html?id=${viewId}`, '_blank');
        } else if (target.dataset.edit) {
          editId = target.dataset.edit;
          const b = await getJSON('/api/admin/books');
          const book = b.find(x=>x._id===editId);
          if (!book) return;
          modal.classList.remove('hidden');
          document.getElementById('formTitle').innerText = 'Edit Book';
          form.title.value = book.title || '';
          form.author.value = book.author || '';
          form.price.value = book.price || '';
          form.rentPrice.value = book.rentPrice || '';
          form.description.value = book.description || '';
          form.coverImage.value = book.coverImage || '';
          form.stock.value = book.stock || 1;
        }
      });
    }

    addBtn && addBtn.addEventListener('click', ()=> {
      editId = null;
      modal.classList.remove('hidden');
      form.reset();
      document.getElementById('formTitle').innerText = 'Add Book';
    });

    document.getElementById('cancelForm').addEventListener('click', ()=> modal.classList.add('hidden'));

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        title: form.title.value,
        author: form.author.value,
        price: parseFloat(form.price.value||0),
        rentPrice: parseFloat(form.rentPrice.value||0),
        description: form.description.value,
        coverImage: form.coverImage.value,
        stock: parseInt(form.stock.value||1,10)
      };
      if (editId) {
        await fetch('/api/admin/books/' + editId, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
      } else {
        await postJSON('/api/admin/books', payload);
      }
      modal.classList.add('hidden');
      loadBooks();
    });

    loadBooks();
  }

  // Initial load for the dashboard page.
  refreshDashboardCounts();

  // Refresh counts every time the page is shown (e.g., when using the back button)
  // This also handles subsequent navigations to the page.
  window.addEventListener('pageshow', refreshDashboardCounts);
});
