document.addEventListener("DOMContentLoaded", async () => {
  await requireSession();
  await loadAll();

  document.getElementById("board-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const nameInput = document.getElementById("board-name");
    const errorMsg = document.getElementById("board-error");
    errorMsg.textContent = "";

    const res = await apiFetch("/api/boards", {
      method: "POST",
      body: JSON.stringify({ name: nameInput.value }),
    });
    if (!res.ok) {
      errorMsg.textContent = res.status === 403 ? "No tenés permisos de admin" : "No se pudo crear el mural";
      return;
    }
    nameInput.value = "";
    await loadBoards();
  });

  document.getElementById("prompt-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const textInput = document.getElementById("prompt-text");
    const errorMsg = document.getElementById("prompt-error");
    errorMsg.textContent = "";

    const res = await apiFetch("/api/prompts", {
      method: "POST",
      body: JSON.stringify({ text: textInput.value }),
    });
    if (!res.ok) {
      errorMsg.textContent = res.status === 403 ? "No tenés permisos de admin" : "No se pudo crear la consigna";
      return;
    }
    textInput.value = "";
    await loadPrompts();
  });

  document.getElementById("reset-btn").addEventListener("click", async () => {
    if (!confirm("¿Reiniciar TODO el juego? Borra murales, consignas, fotos (también los archivos) y votos. No se puede deshacer.")) return;

    const res = await apiFetch("/api/admin/reset", { method: "DELETE" });
    if (!res.ok) {
      alert("No se pudo reiniciar el juego");
      return;
    }
    alert("Juego reiniciado");
    await loadAll();
  });

  document.getElementById("save-ends-at").addEventListener("click", () => {
    const value = document.getElementById("ends-at").value;
    if (!value) {
      document.getElementById("game-error").textContent = "Elegí una fecha y hora";
      return;
    }
    // El input da la hora local sin zona: Date la interpreta como local y toISOString la pasa a UTC
    saveEndsAt(new Date(value).toISOString());
  });
  document.getElementById("close-now").addEventListener("click", () => {
    if (!confirm("¿Cerrar el juego ahora? Se bloquean las fotos y los votos.")) return;
    saveEndsAt(new Date().toISOString());
  });
  document.getElementById("clear-ends-at").addEventListener("click", () => saveEndsAt(null));

  document.getElementById("download-all-btn").addEventListener("click", downloadAllPhotos);
  document.getElementById("logout-btn").addEventListener("click", logout);
});

async function loadAll() {
  await Promise.all([loadBoards(), loadPrompts(), loadPhotos(), loadGame()]);
}

// Para el input datetime-local, que espera "AAAA-MM-DDTHH:MM" en hora local
function toLocalInputValue(iso) {
  const date = new Date(iso);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function renderGameStatus(game) {
  const status = document.getElementById("game-status");
  const input = document.getElementById("ends-at");
  if (!game.ends_at) {
    status.textContent = "🟢 Abierto, sin fecha de cierre.";
    input.value = "";
    return;
  }
  const when = new Date(game.ends_at).toLocaleString("es", { dateStyle: "medium", timeStyle: "short" });
  status.textContent = game.closed ? `🔴 Cerrado desde el ${when}.` : `🟢 Abierto, cierra el ${when}.`;
  input.value = toLocalInputValue(game.ends_at);
}

async function loadGame() {
  const res = await apiFetch("/api/game");
  renderGameStatus(await res.json());
}

async function saveEndsAt(endsAt) {
  const errorMsg = document.getElementById("game-error");
  errorMsg.textContent = "";
  const res = await apiFetch("/api/admin/game", {
    method: "PUT",
    body: JSON.stringify({ ends_at: endsAt }),
  });
  if (!res.ok) {
    errorMsg.textContent = res.status === 403 ? "No tenés permisos de admin" : "No se pudo guardar el cierre";
    return;
  }
  renderGameStatus(await res.json());
}

// Una fila de la lista con su texto y los botones de renombrar y borrar
function editableRow({ label, onRename, onDelete }) {
  const li = document.createElement("li");
  li.className = "admin-row";

  const text = document.createElement("span");
  text.textContent = label;
  li.appendChild(text);

  const renameBtn = document.createElement("button");
  renameBtn.type = "button";
  renameBtn.className = "icon-btn";
  renameBtn.title = "Renombrar";
  renameBtn.textContent = "✏️";
  renameBtn.addEventListener("click", onRename);
  li.appendChild(renameBtn);

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "icon-btn";
  deleteBtn.title = "Borrar";
  deleteBtn.textContent = "🗑️";
  deleteBtn.addEventListener("click", onDelete);
  li.appendChild(deleteBtn);

  return li;
}

async function renameItem(path, field, current, label) {
  const value = prompt(`Nuevo texto para ${label}:`, current)?.trim();
  if (!value || value === current) return;
  const res = await apiFetch(path, { method: "PUT", body: JSON.stringify({ [field]: value }) });
  if (!res.ok) {
    alert(`No se pudo renombrar ${label}`);
    return;
  }
  await loadAll();
}

async function deleteItem(path, question) {
  if (!confirm(question)) return;
  const res = await apiFetch(path, { method: "DELETE" });
  if (!res.ok) {
    alert("No se pudo borrar");
    return;
  }
  await loadAll();
}

async function loadBoards() {
  const res = await apiFetch("/api/boards");
  const boards = await res.json();
  const list = document.getElementById("boards-list");
  list.replaceChildren(
    ...boards.map((board) =>
      editableRow({
        label: board.name,
        onRename: () => renameItem(`/api/boards/${board.id}`, "name", board.name, "el mural"),
        onDelete: () =>
          deleteItem(
            `/api/boards/${board.id}`,
            `¿Borrar el mural "${board.name}"? Se borran sus fotos y votos, y sus jugadores van a tener que elegir otro mural.`
          ),
      })
    )
  );
}

async function loadPrompts() {
  const res = await apiFetch("/api/prompts");
  const prompts = await res.json();
  const list = document.getElementById("prompts-list");
  list.replaceChildren(
    ...prompts.map((item) =>
      editableRow({
        label: item.text,
        onRename: () => renameItem(`/api/prompts/${item.id}`, "text", item.text, "la consigna"),
        onDelete: () =>
          deleteItem(
            `/api/prompts/${item.id}`,
            `¿Borrar la consigna "${item.text}"? Se borran todas sus fotos y votos en todos los murales.`
          ),
      })
    )
  );
}

async function loadPhotos() {
  const container = document.getElementById("photos-admin");
  const res = await apiFetch("/api/admin/photos");
  if (!res.ok) {
    container.textContent = res.status === 403 ? "No tenés permisos de admin" : "No se pudieron cargar las fotos";
    return;
  }
  const photos = await res.json();
  if (photos.length === 0) {
    container.textContent = "Todavía no hay fotos.";
    return;
  }

  // Ya vienen ordenadas por mural: se agrupan en el orden en que llegan
  const byBoard = new Map();
  for (const photo of photos) {
    if (!byBoard.has(photo.board_id)) byBoard.set(photo.board_id, { name: photo.board_name, photos: [] });
    byBoard.get(photo.board_id).photos.push(photo);
  }

  container.replaceChildren(
    ...[...byBoard.values()].map((group) => {
      const section = document.createElement("div");

      const title = document.createElement("h3");
      title.className = "admin-photos-title";
      title.textContent = `${group.name} · ${group.photos.length}`;
      section.appendChild(title);

      const grid = document.createElement("div");
      grid.className = "admin-photo-grid";
      for (const photo of group.photos) {
        const tile = document.createElement("div");
        tile.className = "admin-photo";

        const img = document.createElement("img");
        img.src = photo.url;
        img.alt = photo.prompt_text;
        img.title = photo.prompt_text;
        img.loading = "lazy";
        img.addEventListener("click", () => openLightbox(photo.url, `${group.name} · ${photo.prompt_text}`));
        tile.appendChild(img);

        const deleteBtn = document.createElement("button");
        deleteBtn.type = "button";
        deleteBtn.className = "photo-delete";
        deleteBtn.textContent = "✕";
        deleteBtn.addEventListener("click", () =>
          deleteItem(`/api/photos/${photo.id}`, `¿Borrar esta foto de "${group.name}" (${photo.prompt_text})?`)
        );
        tile.appendChild(deleteBtn);

        grid.appendChild(tile);
      }
      section.appendChild(grid);
      return section;
    })
  );
}

async function runInBatches(tasks, size) {
  for (let i = 0; i < tasks.length; i += size) {
    await Promise.all(tasks.slice(i, i + size).map((task) => task()));
  }
}

async function downloadAllPhotos() {
  const btn = document.getElementById("download-all-btn");
  const status = document.getElementById("download-status");
  btn.disabled = true;
  status.textContent = "Buscando fotos...";

  try {
    const [photosRes, highlightsRes] = await Promise.all([
      apiFetch("/api/admin/photos"),
      apiFetch("/api/boards/highlights"),
    ]);
    if (photosRes.status === 403) throw new Error("No tenés permisos de admin");
    if (!photosRes.ok || !highlightsRes.ok) throw new Error("No se pudieron obtener las fotos");
    const photos = await photosRes.json();
    const allHighlights = await highlightsRes.json();
    if (photos.length === 0) throw new Error("Todavía no hay fotos");

    const zip = new JSZip();
    const folderByBoard = {};
    for (const photo of photos) {
      folderByBoard[photo.board_id] ??= { name: photo.board_name, path: `${photo.board_id}-${slugify(photo.board_name)}` };
    }

    let done = 0;
    let failed = 0;
    await runInBatches(
      photos.map((photo) => async () => {
        try {
          const blob = await fetchPhotoBlob(photo.url);
          const folder = folderByBoard[photo.board_id].path;
          zip.file(`${folder}/${slugify(photo.prompt_text)}-${photo.id}.jpg`, blob);
        } catch {
          failed++;
        }
        done++;
        status.textContent = `Descargando fotos... ${done}/${photos.length}`;
      }),
      6
    );

    status.textContent = "Armando las tiras...";
    for (const [boardId, folder] of Object.entries(folderByBoard)) {
      const frames = (allHighlights[boardId] || [])
        .filter((h) => h.photo)
        .map((h) => ({ url: h.photo.url, caption: h.prompt_text }));
      if (frames.length === 0) continue;
      try {
        zip.file(`${folder.path}/tira.jpg`, await buildStripBlob(folder.name, frames));
      } catch {
        failed++;
      }
    }

    status.textContent = "Comprimiendo...";
    const zipBlob = await zip.generateAsync({ type: "blob" });
    await saveBlob(zipBlob, `fotos-${new Date().toISOString().slice(0, 10)}.zip`);
    status.textContent = failed
      ? `Listo, pero ${failed} archivo(s) no se pudieron descargar.`
      : "Listo ✔";
  } catch (err) {
    status.textContent = err.message;
  } finally {
    btn.disabled = false;
  }
}
