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


async function logout() {
  await supabaseClient.auth.signOut();
  window.location.href = "/index.html";
}
