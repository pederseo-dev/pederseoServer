const CORK_ROTATIONS = [-6, 4, -8, 3, -3, 7, -5, 5];

document.addEventListener("DOMContentLoaded", async () => {
  await requireSession();
  await renderNav("/murales.html");
  await loadBoards();
});

async function loadBoards() {
  const meRes = await apiFetch("/api/players/me");
  const me = await meRes.json();

  const [myVoteRes, rankingRes, highlightsRes] = await Promise.all([
    apiFetch("/api/board-votes/mine"),
    apiFetch("/api/boards/ranking"),
    apiFetch("/api/boards/highlights"),
  ]);
  const myVote = await myVoteRes.json();
  const ranking = await rankingRes.json();
  const allHighlights = await highlightsRes.json();

  const container = document.getElementById("boards-container");
  container.innerHTML = "";

  // `ranking` ya viene ordenado de más a menos votado desde el backend.
  for (const entry of ranking) {
    const isOwnBoard = entry.board_id === me.board_id;
    const alreadyVoted = myVote && myVote.target_board_id === entry.board_id;

    const highlights = allHighlights[entry.board_id] || [];
    const highlightsWithPhoto = highlights.filter((h) => h.photo);

    const card = document.createElement("section");
    card.className = "card";

    const title = document.createElement("h2");
    title.textContent = isOwnBoard ? `${entry.board_name} (tu mural)` : entry.board_name;
    card.appendChild(title);

    if (highlightsWithPhoto.length === 0) {
      const empty = document.createElement("p");
      empty.textContent = "Todavía no tiene fotos.";
      card.appendChild(empty);
      container.appendChild(card);
      continue;
    }

    const corkboard = document.createElement("div");
    corkboard.className = "board-corkboard";

    highlightsWithPhoto.forEach((highlight, index) => {
      const tile = document.createElement("button");
      tile.type = "button";
      tile.className = "cork-photo";
      tile.style.transform = `rotate(${CORK_ROTATIONS[index % CORK_ROTATIONS.length]}deg)`;

      const img = document.createElement("img");
      img.src = highlight.photo.url;
      tile.appendChild(img);

      tile.addEventListener("click", () => {
        openLightbox(highlight.photo.url, highlight.prompt_text);
      });

      corkboard.appendChild(tile);
    });
    card.appendChild(corkboard);

    const voteLabel = `${entry.vote_count} voto${entry.vote_count === 1 ? "" : "s"}`;

    if (isOwnBoard) {
      const info = document.createElement("p");
      info.textContent = `${voteLabel} recibidos`;
      card.appendChild(info);
    } else {
      const voteBtn = document.createElement("button");
      voteBtn.type = "button";
      voteBtn.textContent = `Votar · ${voteLabel}`;
      if (!alreadyVoted) voteBtn.className = "secondary";
      voteBtn.addEventListener("click", async () => {
        const res = alreadyVoted
          ? await apiFetch("/api/board-votes", { method: "DELETE" })
          : await apiFetch("/api/board-votes", {
              method: "POST",
              body: JSON.stringify({ target_board_id: entry.board_id }),
            });
        if (!res.ok) {
          alert("No se pudo actualizar el voto");
          return;
        }
        await loadBoards();
      });
      card.appendChild(voteBtn);
    }

    const downloadBtn = document.createElement("button");
    downloadBtn.type = "button";
    downloadBtn.className = "secondary";
    downloadBtn.textContent = "📸 Descargar tira";
    downloadBtn.addEventListener("click", async () => {
      downloadBtn.disabled = true;
      downloadBtn.textContent = "Armando tira...";
      try {
        const frames = highlightsWithPhoto.map((h) => ({ url: h.photo.url, caption: h.prompt_text }));
        const blob = await buildStripBlob(entry.board_name, frames);
        await saveBlob(blob, `tira-${slugify(entry.board_name)}.jpg`);
      } catch (err) {
        alert(err.message);
      } finally {
        downloadBtn.disabled = false;
        downloadBtn.textContent = "📸 Descargar tira";
      }
    });
    card.appendChild(downloadBtn);

    container.appendChild(card);
  }
}
