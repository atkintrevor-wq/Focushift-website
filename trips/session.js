(function () {
  const FLAG = 'trips_signed_in';

  function remember(on) {
    try {
      if (on) localStorage.setItem(FLAG, '1');
      else localStorage.removeItem(FLAG);
    } catch {
      // Private mode can refuse storage. The cookie still signs the phone in.
    }
  }

  function remembered() {
    try {
      return localStorage.getItem(FLAG) === '1';
    } catch {
      return false;
    }
  }

  async function check() {
    if (!navigator.onLine) return remembered();
    try {
      const res = await fetch('/trips/api/session', { cache: 'no-store' });
      if (res.ok) {
        remember(true);
        return true;
      }
      if (res.status === 401 || res.status === 503) {
        remember(false);
        return false;
      }
    } catch {
      return remembered();
    }
    return false;
  }

  async function login(password) {
    const res = await fetch('/trips/api/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const error = new Error(data.error || 'That password was not accepted.');
      error.status = res.status;
      throw error;
    }
    remember(true);
    return data;
  }

  async function logout() {
    remember(false);
    await fetch('/trips/api/logout', { method: 'POST' }).catch(() => {});
  }

  window.TripSession = { check, login, logout, remember };
})();
