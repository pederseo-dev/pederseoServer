document.addEventListener("DOMContentLoaded", async () => {
  await requireSession();

  const mesaSelect = document.getElementById("mesa_id");
  const mesasRes = await apiFetch("/photo-wedding/mesas");
  const mesas = await mesasRes.json();
  for (const mesa of mesas) {
    const option = document.createElement("option");
    option.value = mesa.id;
    option.textContent = mesa.name;
    mesaSelect.appendChild(option);
  }

  const form = document.getElementById("registro-form");
  const errorMsg = document.getElementById("error-msg");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorMsg.textContent = "";

    const display_name = document.getElementById("display_name").value;
    const mesa_id = Number(mesaSelect.value);

    const res = await apiFetch("/photo-wedding/players/me", {
      method: "POST",
      body: JSON.stringify({ display_name, mesa_id }),
    });

    if (!res.ok) {
      errorMsg.textContent = "No se pudo completar el registro";
      return;
    }
    window.location.href = "/juego.html";
  });
    document.getElementById("logout-btn").addEventListener("click", logout);

});


