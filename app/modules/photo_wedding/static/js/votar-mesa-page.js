const CORK_ROTATIONS = [-6, 4, -8, 3, -3, 7, -5, 5];

document.addEventListener("DOMContentLoaded", async () => {
  await requireSession();
  await renderNav("/votar-mesa.html");
  await loadVotingMesas();
});

async function loadVotingMesas() {
  const meRes = await apiFetch("/photo-wedding/players/me");
  const me = await meRes.json();

  const [mesasRes, myVoteRes, generalRes, allVidrieraRes] = await Promise.all([
    apiFetch("/photo-wedding/mesas"),
    apiFetch("/photo-wedding/mesa-votes/mine"),
    apiFetch("/photo-wedding/vidriera/general"),
    apiFetch("/photo-wedding/vidriera/mesas"),
  ]);
  const mesas = await mesasRes.json();
  const myVote = await myVoteRes.json();
  const general = await generalRes.json();
  const allVidriera = await allVidrieraRes.json();

  const mesaById = Object.fromEntries(mesas.map((m) => [m.id, m]));

  const container = document.getElementById("mesas-container");
  container.innerHTML = "";

  // `general` ya viene ordenado de más a menos votada desde el backend.
  for (const entry of general) {
    const mesa = mesaById[entry.mesa_id];
    if (!mesa) continue;

    const isOwnMesa = entry.mesa_id === me.mesa_id;
    const alreadyVoted = myVote && myVote.target_mesa_id === entry.mesa_id;

    const vidriera = allVidriera[entry.mesa_id] || [];
    const entriesWithPhoto = vidriera.filter((v) => v.photo);

    const card = document.createElement("section");
    card.className = "card";

    const title = document.createElement("h2");
    title.textContent = isOwnMesa ? `${mesa.name} (tu mesa)` : mesa.name;
    card.appendChild(title);

    if (entriesWithPhoto.length === 0) {
      const empty = document.createElement("p");
      empty.textContent = "Todavía no tienen fotos votadas.";
      card.appendChild(empty);
      container.appendChild(card);
      continue;
    }

    const board = document.createElement("div");
    board.className = "mesa-corkboard";

    entriesWithPhoto.forEach((itemEntry, index) => {
      const tile = document.createElement("button");
      tile.type = "button";
      tile.className = "cork-photo";
      tile.style.transform = `rotate(${CORK_ROTATIONS[index % CORK_ROTATIONS.length]}deg)`;

      const img = document.createElement("img");
      img.src = itemEntry.photo.url;
      tile.appendChild(img);

      tile.addEventListener("click", () => {
        openLightbox(itemEntry.photo.url, itemEntry.item_description);
      });

      board.appendChild(tile);
    });
    card.appendChild(board);

    const voteLabel = `${entry.vote_count} voto${entry.vote_count === 1 ? "" : "s"}`;

    if (isOwnMesa) {
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
          ? await apiFetch("/photo-wedding/mesa-votes", { method: "DELETE" })
          : await apiFetch("/photo-wedding/mesa-votes", {
              method: "POST",
              body: JSON.stringify({ target_mesa_id: entry.mesa_id }),
            });
        if (!res.ok) {
          alert("No se pudo actualizar el voto");
          return;
        }
        await loadVotingMesas();
      });
      card.appendChild(voteBtn);
    }

    container.appendChild(card);
  }
}
