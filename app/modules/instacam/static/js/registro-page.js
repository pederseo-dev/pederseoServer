document.addEventListener("DOMContentLoaded", async () => {
  await requireSession();

  const boardSelect = document.getElementById("board_id");
  const boardsRes = await apiFetch("/api/boards");
  const boards = await boardsRes.json();
  for (const board of boards) {
    const option = document.createElement("option");
    option.value = board.id;
    option.textContent = board.name;
    boardSelect.appendChild(option);
  }

  const form = document.getElementById("registro-form");
  const errorMsg = document.getElementById("error-msg");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorMsg.textContent = "";

    const display_name = document.getElementById("display_name").value;
    const board_id = Number(boardSelect.value);

    const res = await apiFetch("/api/players/me", {
      method: "POST",
      body: JSON.stringify({ display_name, board_id }),
    });

    if (!res.ok) {
      errorMsg.textContent = "No se pudo completar el registro";
      return;
    }
    window.location.href = "/mi-mural.html";
  });
    document.getElementById("logout-btn").addEventListener("click", logout);

});
