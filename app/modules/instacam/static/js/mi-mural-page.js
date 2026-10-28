let gameClosed = false;
// Mientras se sube una foto no se refresca solo, para no borrar el "Subiendo..."
let uploading = false;

document.addEventListener("DOMContentLoaded", async () => {
  await requireSession();
  const game = await renderNav("/mi-mural.html");
  gameClosed = game.closed;
  await loadMiMural();
  autoRefresh(() => (uploading ? Promise.resolve() : loadMiMural()), 10);
});

async function loadMiMural() {
  const [promptsRes, photosRes, myVotesRes, { data: sessionData }] = await Promise.all([
    apiFetch("/api/prompts"),
    apiFetch("/api/photos/mine"),
    apiFetch("/api/prompt-votes/mine"),
    supabaseClient.auth.getSession(),
  ]);
  const prompts = await promptsRes.json();
  const photos = await photosRes.json();
  const myVotes = await myVotesRes.json();
  const currentUserId = sessionData.session.user.id;
  if (!hasChanged("mi-mural", [prompts, photos, myVotes])) return;

  const myVoteByPrompt = Object.fromEntries(myVotes.map((v) => [v.prompt_id, v.photo_id]));

  const container = document.getElementById("prompts-container");
  container.innerHTML = "";

  for (const prompt of prompts) {
    const photosForPrompt = photos.filter((p) => p.prompt_id === prompt.id);

    const card = document.createElement("section");
    card.className = "card";

    const title = document.createElement("h2");
    title.textContent = prompt.text;
    card.appendChild(title);

    if (photosForPrompt.length === 0) {
      const empty = document.createElement("p");
      empty.textContent = "Todavía nadie subió una foto para esta consigna.";
      card.appendChild(empty);
    } else {
      const strip = document.createElement("div");
      strip.className = "photo-strip";

      const perforation = document.createElement("div");
      perforation.className = "strip-perforation";
      strip.appendChild(perforation);

      photosForPrompt.forEach((photo, index) => {
        const alreadyVoted = myVoteByPrompt[prompt.id] === photo.id;
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

        if (photo.uploaded_by === currentUserId && !gameClosed) {
          const deleteBtn = document.createElement("button");
          deleteBtn.type = "button";
          deleteBtn.className = "strip-badge strip-badge-delete";
          deleteBtn.textContent = "✕";
          deleteBtn.addEventListener("click", async () => {
            if (!confirm("¿Borrar esta foto?")) return;
            const res = await apiFetch(`/api/photos/${photo.id}`, { method: "DELETE" });
            if (reloadIfGameClosed(res)) return;
            if (!res.ok) {
              alert("No se pudo borrar la foto");
              return;
            }
            await loadMiMural();
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

        // Con el juego cerrado queda solo como contador
        voteBtn.disabled = gameClosed;
        voteBtn.addEventListener("click", async () => {
          const res = alreadyVoted
            ? await apiFetch(`/api/prompt-votes/${prompt.id}`, { method: "DELETE" })
            : await apiFetch("/api/prompt-votes", {
                method: "POST",
                body: JSON.stringify({ prompt_id: prompt.id, photo_id: photo.id }),
              });
          if (reloadIfGameClosed(res)) return;
          if (!res.ok) {
            alert("No se pudo actualizar el voto");
            return;
          }
          await loadMiMural();
        });
        photoWrap.appendChild(voteBtn);

        frame.appendChild(photoWrap);
        strip.appendChild(frame);
      });

      card.appendChild(strip);
    }

    if (gameClosed) {
      container.appendChild(card);
      continue;
    }

    const shootBtn = document.createElement("button");
    shootBtn.type = "button";
    shootBtn.textContent = photosForPrompt.length > 0 ? "Sacar otra foto" : "Sacar foto";

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
      uploading = true;
      try {
        const url = await uploadPhotoBlob(blob, prompt.id);
        const res = await apiFetch("/api/photos", {
          method: "POST",
          body: JSON.stringify({ prompt_id: prompt.id, url }),
        });
        if (reloadIfGameClosed(res)) return;
        if (!res.ok) throw new Error("No se pudo guardar la foto");
        status.textContent = "";
        await loadMiMural();
      } catch (err) {
        status.textContent = err.message;
      } finally {
        uploading = false;
      }
    });

    card.appendChild(shootBtn);
    card.appendChild(status);
    container.appendChild(card);
  }
}
