// El QR de cada mural abre /registro.html?mural=ID. Se guarda antes de pedir sesión,
// porque si hay que loguearse primero se vuelve acá sin el parámetro.
const PENDING_BOARD_KEY = "instacam-pending-board";

function rememberBoardFromUrl() {
  const fromUrl = new URLSearchParams(location.search).get("mural");
  try {
    if (fromUrl) localStorage.setItem(PENDING_BOARD_KEY, fromUrl);
    return fromUrl || localStorage.getItem(PENDING_BOARD_KEY);
  } catch {
    return fromUrl;
  }
}

function forgetPendingBoard() {
  try {
    localStorage.removeItem(PENDING_BOARD_KEY);
  } catch {}
}

document.addEventListener("DOMContentLoaded", async () => {
  const pendingBoard = rememberBoardFromUrl();
  await requireSession();

  // Si ya eligió mural, el QR no cambia nada: va directo a su mural
  const meRes = await apiFetch("/api/players/me");
  if (meRes.ok) {
    forgetPendingBoard();
    window.location.href = "/mi-mural.html";
    return;
  }

  const boardSelect = document.getElementById("board_id");
  const boardsRes = await apiFetch("/api/boards");
  const boards = await boardsRes.json();
  for (const board of boards) {
    const option = document.createElement("option");
    option.value = board.id;
    option.textContent = board.name;
    boardSelect.appendChild(option);
  }
  if (boards.some((board) => String(board.id) === pendingBoard)) {
    boardSelect.value = pendingBoard;
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
    forgetPendingBoard();
    window.location.href = "/mi-mural.html";
  });

  document.getElementById("logout-btn").addEventListener("click", logout);
});
