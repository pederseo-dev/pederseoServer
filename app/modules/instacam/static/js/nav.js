// Devuelve el estado del juego ({ ends_at, closed, now }) para que cada página sepa si está cerrado
async function renderNav(activeHref) {
  const container = document.getElementById("nav");
  if (!container) return;

  const [isAdminRes, gameRes] = await Promise.all([apiFetch("/api/is-admin"), apiFetch("/api/game")]);
  const { is_admin } = await isAdminRes.json();
  const game = await gameRes.json();

  const links = [
    { href: "/mi-mural.html", label: "Mi mural" },
    { href: "/murales.html", label: "Otros murales" },
  ];
  if (game.closed) {
    links.push({ href: "/resultados.html", label: "🏆 Resultados" });
  }
  if (is_admin) {
    links.push({ href: "/admin.html", label: "Admin" });
  }

  const header = document.createElement("div");
  header.className = "nav-header";

  const logo = document.createElement("img");
  logo.src = "/assets/logo.png";
  logo.alt = "Logo";
  logo.className = "nav-logo";
  header.appendChild(logo);

  const nav = document.createElement("nav");
  nav.className = "tabs";

  for (const link of links) {
    const a = document.createElement("a");
    a.href = link.href;
    a.textContent = link.label;
    if (link.href === activeHref) a.classList.add("active");
    nav.appendChild(a);
  }

  const logoutLink = document.createElement("a");
  logoutLink.href = "#";
  logoutLink.textContent = "Salir";
  logoutLink.addEventListener("click", (e) => {
    e.preventDefault();
    logout();
  });
  nav.appendChild(logoutLink);

  header.appendChild(nav);
  container.replaceWith(header);

  if (game.ends_at) header.after(renderGameBanner(game));
  return game;
}

function formatTimeLeft(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (days > 0) return `${days} d ${hours} h`;
  if (hours > 0) return `${hours} h ${String(minutes).padStart(2, "0")} min`;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function renderGameBanner(game) {
  const banner = document.createElement("p");
  banner.className = "game-banner";

  if (game.closed) {
    banner.classList.add("closed");
    banner.append("El juego terminó. ");
    const link = document.createElement("a");
    link.href = "/resultados.html";
    link.textContent = "Ver resultados 🏆";
    banner.appendChild(link);
    return banner;
  }

  // Se cuenta con la hora del servidor, así no importa si el reloj del celular está mal
  const offset = Date.parse(game.now) - Date.now();
  const endsAt = Date.parse(game.ends_at);
  const tick = () => {
    const left = endsAt - (Date.now() + offset);
    if (left <= 0) {
      clearInterval(timer);
      banner.textContent = "⏳ Cerrando...";
      setTimeout(() => location.reload(), 1500);
      return;
    }
    banner.textContent = `⏳ El juego cierra en ${formatTimeLeft(left)}`;
  };
  const timer = setInterval(tick, 1000);
  tick();
  return banner;
}
