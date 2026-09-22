document.addEventListener("DOMContentLoaded", async () => {
  await requireSession();
  await loadMesas();
  await loadItems();

  document.getElementById("mesa-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const nameInput = document.getElementById("mesa-name");
    const errorMsg = document.getElementById("mesa-error");
    errorMsg.textContent = "";

    const res = await apiFetch("/photo-wedding/mesas", {
      method: "POST",
      body: JSON.stringify({ name: nameInput.value }),
    });
    if (!res.ok) {
      errorMsg.textContent = res.status === 403 ? "No tenés permisos de admin" : "No se pudo crear la mesa";
      return;
    }
    nameInput.value = "";
    await loadMesas();
  });

  document.getElementById("item-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const descInput = document.getElementById("item-description");
    const errorMsg = document.getElementById("item-error");
    errorMsg.textContent = "";

    const res = await apiFetch("/photo-wedding/items", {
      method: "POST",
      body: JSON.stringify({ description: descInput.value }),
    });
    if (!res.ok) {
      errorMsg.textContent = res.status === 403 ? "No tenés permisos de admin" : "No se pudo crear el item";
      return;
    }
    descInput.value = "";
    await loadItems();
  });

  document.getElementById("reset-btn").addEventListener("click", async () => {
    if (!confirm("¿Reiniciar TODO el juego? Borra mesas, items, fotos y votos. No se puede deshacer.")) return;

    const res = await apiFetch("/photo-wedding/admin/reset", { method: "DELETE" });
    if (!res.ok) {
      alert("No se pudo reiniciar el juego");
      return;
    }
    alert("Juego reiniciado");
    await loadMesas();
    await loadItems();
  });

  document.getElementById("logout-btn").addEventListener("click", logout);
});

async function loadMesas() {
  const res = await apiFetch("/photo-wedding/mesas");
  const mesas = await res.json();
  const list = document.getElementById("mesas-list");
  list.innerHTML = "";
  for (const mesa of mesas) {
    const li = document.createElement("li");
    li.textContent = mesa.name;
    list.appendChild(li);
  }
}

async function loadItems() {
  const res = await apiFetch("/photo-wedding/items");
  const items = await res.json();
  const list = document.getElementById("items-list");
  list.innerHTML = "";
  for (const item of items) {
    const li = document.createElement("li");
    li.textContent = item.description;
    list.appendChild(li);
  }
}
