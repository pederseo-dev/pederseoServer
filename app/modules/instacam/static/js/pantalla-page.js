// Pantalla para proyectar en el evento: murales con su ranking y las últimas fotos, en vivo.
// Solo para el admin: muestra todas las fotos, no solo las ganadoras.
const FEED_SIZE = 6;
const SCREEN_MEDALS = { 1: "🥇", 2: "🥈", 3: "🥉" };

// Las fotos que ya estaban en pantalla: las nuevas entran con animación
const seenPhotoIds = new Set();
let firstLoad = true;
let bannerEndsAt;

document.addEventListener("DOMContentLoaded", async () => {
  await requireSession();

  const adminRes = await apiFetch("/api/is-admin");
  const { is_admin } = await adminRes.json();
  if (!is_admin) {
    document.querySelector(".screen-layout").textContent = "Esta pantalla es solo para el admin.";
    return;
  }

  document.getElementById("fullscreen-btn").addEventListener("click", () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen?.();
  });

  await loadScreen();
  autoRefresh(loadScreen, 5);
});

async function loadScreen() {
  const [gameRes, rankingRes, highlightsRes, photosRes] = await Promise.all([
    apiFetch("/api/game"),
    apiFetch("/api/boards/ranking"),
    apiFetch("/api/boards/highlights"),
    apiFetch("/api/admin/photos"),
  ]);
  const game = await gameRes.json();
  const ranking = await rankingRes.json();
  const allHighlights = await highlightsRes.json();
  const photos = await photosRes.json();

  renderBanner(game);
  if (hasChanged("screen-boards", [game.closed, ranking, allHighlights])) {
    renderBoards(game, ranking, allHighlights);
  }
  if (hasChanged("screen-feed", photos)) {
    renderFeed(photos);
  }
  firstLoad = false;
}

function renderBanner(game) {
  // El banner tiene su propio reloj: solo se rearma si cambia el cierre
  const key = `${game.ends_at}|${game.closed}`;
  if (key === bannerEndsAt) return;
  bannerEndsAt = key;
  const slot = document.getElementById("screen-banner");
  slot.replaceChildren(game.ends_at ? renderGameBanner(game) : "");
}

function renderBoards(game, ranking, allHighlights) {
  document.getElementById("boards-title").textContent = game.closed ? "🏆 Resultados" : "Murales";
  const container = document.getElementById("screen-boards");

  if (ranking.length === 0) {
    container.textContent = "Todavía no hay murales.";
    return;
  }

  container.replaceChildren(
    ...ranking.map((entry) => {
      // Los empatados comparten puesto, igual que en "Resultados"
      const place = 1 + ranking.filter((other) => other.vote_count > entry.vote_count).length;
      const medal = entry.vote_count > 0 ? SCREEN_MEDALS[place] : undefined;
      const highlights = (allHighlights[entry.board_id] || []).filter((h) => h.photo);

      const card = document.createElement("section");
      card.className = "card screen-board";
      if (medal && place === 1) card.classList.add("podium-1");

      const title = document.createElement("h3");
      title.textContent = `${medal ? `${medal} ` : ""}${entry.board_name}`;
      card.appendChild(title);

      const votes = document.createElement("p");
      votes.className = "podium-votes";
      votes.textContent = voteCountLabel(entry.vote_count);
      card.appendChild(votes);

      if (highlights.length > 0) {
        card.appendChild(renderCorkboard(highlights));
      } else {
        const empty = document.createElement("p");
        empty.textContent = "Todavía sin fotos.";
        card.appendChild(empty);
      }
      return card;
    })
  );
}

function renderFeed(photos) {
  const container = document.getElementById("screen-feed");
  const latest = [...photos].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)).slice(0, FEED_SIZE);

  if (latest.length === 0) {
    container.textContent = "Las fotos van a aparecer acá apenas las saquen.";
    return;
  }

  container.replaceChildren(
    ...latest.map((photo) => {
      const figure = document.createElement("figure");
      figure.className = "screen-photo";
      if (!firstLoad && !seenPhotoIds.has(photo.id)) figure.classList.add("is-new");

      const img = document.createElement("img");
      img.src = photo.url;
      img.alt = photo.prompt_text;
      img.addEventListener("click", () => openLightbox(photo.url, `${photo.board_name} · ${photo.prompt_text}`));
      figure.appendChild(img);

      const caption = document.createElement("figcaption");
      const board = document.createElement("strong");
      board.textContent = photo.board_name;
      caption.append(board, ` · ${photo.prompt_text}`);
      figure.appendChild(caption);

      return figure;
    })
  );
  for (const photo of photos) seenPhotoIds.add(photo.id);
}
