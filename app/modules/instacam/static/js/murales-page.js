let gameClosed = false;

document.addEventListener("DOMContentLoaded", async () => {
  await requireSession();
  const game = await renderNav("/murales.html");
  gameClosed = game.closed;
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

    card.appendChild(renderCorkboard(highlightsWithPhoto));

    const voteLabel = voteCountLabel(entry.vote_count);

    if (isOwnBoard || gameClosed) {
      const info = document.createElement("p");
      info.textContent = isOwnBoard ? `${voteLabel} recibidos` : voteLabel;
      if (alreadyVoted) info.textContent += " · tu voto ❤️";
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
        if (reloadIfGameClosed(res)) return;
        if (!res.ok) {
          alert("No se pudo actualizar el voto");
          return;
        }
        await loadBoards();
      });
      card.appendChild(voteBtn);
    }

    card.appendChild(stripDownloadButton(entry.board_name, highlightsWithPhoto));
    container.appendChild(card);
  }
}
