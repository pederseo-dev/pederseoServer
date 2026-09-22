document.addEventListener("DOMContentLoaded", async () => {
  await requireSession();
  await renderNav("/votar-mesa.html");
  await loadVotingMesas();
});

async function loadVotingMesas() {
  const meRes = await apiFetch("/photo-wedding/players/me");
  const me = await meRes.json();

  const [mesasRes, myVoteRes, generalRes] = await Promise.all([
    apiFetch("/photo-wedding/mesas"),
    apiFetch("/photo-wedding/mesa-votes/mine"),
    apiFetch("/photo-wedding/vidriera/general"),
  ]);
  const mesas = await mesasRes.json();
  const myVote = await myVoteRes.json();
  const general = await generalRes.json();

  const mesaById = Object.fromEntries(mesas.map((m) => [m.id, m]));

  // `general` ya viene ordenado de más a menos votada desde el backend.
  const otherMesaEntries = general.filter((g) => g.mesa_id !== me.mesa_id && mesaById[g.mesa_id]);

  const container = document.getElementById("mesas-container");
  container.innerHTML = "";

  for (const entry of otherMesaEntries) {
    const mesa = mesaById[entry.mesa_id];
    const alreadyVoted = myVote && myVote.target_mesa_id === entry.mesa_id;

    const vidrieraRes = await apiFetch(`/photo-wedding/vidriera/mesa/${entry.mesa_id}`);
    const vidriera = await vidrieraRes.json();
    const entriesWithPhoto = vidriera.filter((v) => v.photo);

    const card = document.createElement("section");
    card.className = "card";

    const title = document.createElement("h2");
    title.textContent = mesa.name;
    card.appendChild(title);

    if (entriesWithPhoto.length === 0) {
      const empty = document.createElement("p");
      empty.textContent = "Todavía no tienen fotos votadas.";
      card.appendChild(empty);
      container.appendChild(card);
      continue;
    }

    const strip = document.createElement("div");
    strip.className = "photo-strip";

    const perforation = document.createElement("div");
    perforation.className = "strip-perforation";
    strip.appendChild(perforation);

    entriesWithPhoto.forEach((itemEntry) => {
      const frame = document.createElement("div");
      frame.className = "strip-frame";

      const caption = document.createElement("p");
      caption.className = "strip-caption";
      caption.textContent = itemEntry.item_description;
      frame.appendChild(caption);

      const photoWrap = document.createElement("div");
      photoWrap.className = "strip-frame-photo";

      const img = document.createElement("img");
      img.src = itemEntry.photo.url;
      photoWrap.appendChild(img);

      frame.appendChild(photoWrap);
      strip.appendChild(frame);
    });

    card.appendChild(strip);

    const voteBtn = document.createElement("button");
    voteBtn.type = "button";
    const voteLabel = `${entry.vote_count} voto${entry.vote_count === 1 ? "" : "s"}`;
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

    container.appendChild(card);
  }
}
