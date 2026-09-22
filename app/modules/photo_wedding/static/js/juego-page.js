document.addEventListener("DOMContentLoaded", async () => {
  await requireSession();
  await renderNav("/juego.html");
  await loadMiMesa();
});

async function loadMiMesa() {
  const [itemsRes, photosRes, myVotesRes, { data: sessionData }] = await Promise.all([
    apiFetch("/photo-wedding/items"),
    apiFetch("/photo-wedding/photos/mine"),
    apiFetch("/photo-wedding/item-votes/mine"),
    supabaseClient.auth.getSession(),
  ]);
  const items = await itemsRes.json();
  const photos = await photosRes.json();
  const myVotes = await myVotesRes.json();
  const currentUserId = sessionData.session.user.id;

  const myVoteByItem = Object.fromEntries(myVotes.map((v) => [v.item_id, v.photo_id]));

  const container = document.getElementById("items-container");
  container.innerHTML = "";

  for (const item of items) {
    const photosForItem = photos.filter((p) => p.item_id === item.id);

    const card = document.createElement("section");
    card.className = "card";

    const title = document.createElement("h2");
    title.textContent = item.description;
    card.appendChild(title);

    if (photosForItem.length === 0) {
      const empty = document.createElement("p");
      empty.textContent = "Todavía nadie subió una foto para este item.";
      card.appendChild(empty);
    } else {
      const strip = document.createElement("div");
      strip.className = "photo-strip";

      const perforation = document.createElement("div");
      perforation.className = "strip-perforation";
      strip.appendChild(perforation);

      photosForItem.forEach((photo, index) => {
        const alreadyVoted = myVoteByItem[item.id] === photo.id;
        const isLeader = index === 0 && photo.vote_count > 0;

        const frame = document.createElement("div");
        frame.className = "strip-frame";

        const photoWrap = document.createElement("div");
        photoWrap.className = "strip-frame-photo";

        const img = document.createElement("img");
        img.src = photo.url;
        photoWrap.appendChild(img);

        if (isLeader) {
          const leaderBadge = document.createElement("span");
          leaderBadge.className = "strip-badge strip-badge-leader";
          leaderBadge.textContent = "🏆";
          photoWrap.appendChild(leaderBadge);
        }

        if (photo.uploaded_by === currentUserId) {
          const deleteBtn = document.createElement("button");
          deleteBtn.type = "button";
          deleteBtn.className = "strip-badge strip-badge-delete";
          deleteBtn.textContent = "✕";
          deleteBtn.addEventListener("click", async () => {
            if (!confirm("¿Borrar esta foto?")) return;
            const res = await apiFetch(`/photo-wedding/photos/${photo.id}`, { method: "DELETE" });
            if (!res.ok) {
              alert("No se pudo borrar la foto");
              return;
            }
            await loadMiMesa();
          });
          photoWrap.appendChild(deleteBtn);
        }

        const voteBtn = document.createElement("button");
        voteBtn.type = "button";
        voteBtn.className = "strip-badge strip-badge-vote";

        const heartSpan = document.createElement("span");
        heartSpan.className = "heart";
        heartSpan.textContent = alreadyVoted ? "❤️" : "🤍";
        voteBtn.appendChild(heartSpan);

        const countSpan = document.createElement("span");
        countSpan.className = "count";
        countSpan.textContent = photo.vote_count;
        voteBtn.appendChild(countSpan);

        voteBtn.addEventListener("click", async () => {
          const res = alreadyVoted
            ? await apiFetch(`/photo-wedding/item-votes/${item.id}`, { method: "DELETE" })
            : await apiFetch("/photo-wedding/item-votes", {
                method: "POST",
                body: JSON.stringify({ item_id: item.id, photo_id: photo.id }),
              });
          if (!res.ok) {
            alert("No se pudo actualizar el voto");
            return;
          }
          await loadMiMesa();
        });
        photoWrap.appendChild(voteBtn);

        frame.appendChild(photoWrap);
        strip.appendChild(frame);
      });

      card.appendChild(strip);
    }

    const shootBtn = document.createElement("button");
    shootBtn.type = "button";
    shootBtn.textContent = photosForItem.length > 0 ? "Sacar otra foto" : "Sacar foto";

    const status = document.createElement("p");
    status.className = "error";

    shootBtn.addEventListener("click", async () => {
      const { blob, error } = await openCamera();
      if (error) {
        status.textContent = error;
        return;
      }
      if (!blob) return;

      status.style.color = "inherit";
      status.textContent = "Subiendo...";
      try {
        const url = await uploadPhotoBlob(blob, item.id);
        const res = await apiFetch("/photo-wedding/photos", {
          method: "POST",
          body: JSON.stringify({ item_id: item.id, url }),
        });
        if (!res.ok) throw new Error("No se pudo guardar la foto");
        status.textContent = "";
        await loadMiMesa();
      } catch (err) {
        status.textContent = err.message;
      }
    });

    card.appendChild(shootBtn);
    card.appendChild(status);
    container.appendChild(card);
  }
}
