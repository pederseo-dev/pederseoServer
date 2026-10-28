async function apiFetch(path, options = {}) {
  const { data } = await supabaseClient.auth.getSession();
  const token = data.session?.access_token;

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(path, { ...options, headers });
  if (res.status === 401) {
    window.location.href = "/index.html";
    throw new Error("No autenticado");
  }
  return res;
}

// Si el juego cerró con la página abierta (409): avisa y recarga para mostrarla cerrada
function reloadIfGameClosed(res) {
  if (res.status !== 409) return false;
  alert("El juego ya terminó");
  location.reload();
  return true;
}

async function requireSession() {
  const { data } = await supabaseClient.auth.getSession();
  if (!data.session) {
    window.location.href = "/index.html";
    throw new Error("No hay sesión");
  }
  return data.session;
}


// Vuelve a llamar a `load` cada `seconds` segundos mientras la pestaña está a la vista,
// y enseguida cuando la persona vuelve a la pestaña
function autoRefresh(load, seconds) {
  const run = () => {
    if (!document.hidden) load().catch(() => {});
  };
  setInterval(run, seconds * 1000);
  document.addEventListener("visibilitychange", run);
}

// true si `data` es distinto de lo que se dibujó la última vez con esa `key`:
// así el refresco automático no redibuja (ni mueve la pantalla) si no cambió nada
const lastRendered = {};
function hasChanged(key, data) {
  const signature = JSON.stringify(data);
  if (lastRendered[key] === signature) return false;
  lastRendered[key] = signature;
  return true;
}

async function logout() {
  await supabaseClient.auth.signOut();
  window.location.href = "/index.html";
}
