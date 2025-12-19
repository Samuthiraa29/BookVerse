// public/js/toast.js
function showToast(message, type='info', timeout=3000) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.style.position = 'fixed';
    container.style.right = '16px';
    container.style.top = '16px';
    container.style.zIndex = 9999;
    document.body.appendChild(container);
  }
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  t.textContent = message;
  t.style.background = type === 'error' ? '#ef4444' : (type === 'success' ? '#10b981' : '#111827');
  t.style.color = '#fff';
  t.style.padding = '10px 14px';
  t.style.marginTop = '8px';
  t.style.borderRadius = '8px';
  t.style.boxShadow = '0 6px 16px rgba(2,6,23,0.2)';
  t.style.opacity = '0';
  t.style.transition = 'opacity 200ms ease, transform 200ms ease';
  container.appendChild(t);
  requestAnimationFrame(()=>{ t.style.opacity='1'; t.style.transform='translateY(0)'; });
  setTimeout(()=>{
    t.style.opacity='0'; t.style.transform='translateY(-6px)';
    setTimeout(()=>t.remove(),220);
  }, timeout);
  return t;
}

// small helper to clear all toasts
function clearToasts(){ const c=document.getElementById('toast-container'); if(c) c.remove(); }
