async function renderNav(activeHref) {
  const container = document.getElementById("nav");
  if (!container) return;

  const links = [
    { href: "/mi-mural.html", label: "Mi mural" },
    { href: "/murales.html", label: "Otros murales" },
  ];

  const isAdminRes = await apiFetch("/api/is-admin");
  const { is_admin } = await isAdminRes.json();
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
}
