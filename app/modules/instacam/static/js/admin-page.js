document.addEventListener("DOMContentLoaded", async () => {
  await requireSession();
  await loadBoards();
  await loadPrompts();

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
    if (!confirm("¿Reiniciar TODO el juego? Borra murales, consignas, fotos y votos. No se puede deshacer.")) return;

    const res = await apiFetch("/api/admin/reset", { method: "DELETE" });
    if (!res.ok) {
      alert("No se pudo reiniciar el juego");
      return;
    }
    alert("Juego reiniciado");
    await loadBoards();
    await loadPrompts();
  });

  document.getElementById("download-all-btn").addEventListener("click", downloadAllPhotos);
  document.getElementById("logout-btn").addEventListener("click", logout);
});

async function loadBoards() {
  const res = await apiFetch("/api/boards");
  const boards = await res.json();
  const list = document.getElementById("boards-list");
  list.innerHTML = "";
  for (const board of boards) {
    const li = document.createElement("li");
    li.textContent = board.name;
    list.appendChild(li);
  }
}

async function loadPrompts() {
  const res = await apiFetch("/api/prompts");
  const prompts = await res.json();
  const list = document.getElementById("prompts-list");
  list.innerHTML = "";
  for (const prompt of prompts) {
    const li = document.createElement("li");
    li.textContent = prompt.text;
    list.appendChild(li);
  }
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
