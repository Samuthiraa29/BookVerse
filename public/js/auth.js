// public/js/auth.js
async function postJSON(url, data) {
  const res = await fetch(url, {
    method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(data)
  });
  return res.json();
}

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = new FormData(loginForm);
      const data = { email: form.get('email'), password: form.get('password') };
      const res = await postJSON('/api/auth/login', data);
      if (res.ok) {
        // redirect based on role
        if (res.role === 'admin') location.href = '/admin/admin_dashboard.html';
        else location.href = '/user/user_dashboard.html';
      } else showToast(res.error || 'Login failed', 'error');
    });
  }

  const signupForm = document.getElementById('signupForm');
  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = new FormData(signupForm);
      const payload = {
        name: form.get('name'),
        email: form.get('email'),
        password: form.get('password')
      };
      const res = await postJSON('/api/auth/signup', payload);
      if (res.ok) {
        if (res.role === 'admin') location.href = '/admin/admin_dashboard.html';
        else location.href = '/user/user_dashboard.html';
      } else showToast(res.error || 'Signup failed', 'error');
    });
  }
});
