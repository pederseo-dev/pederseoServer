const MEDALS = { 1: "🥇", 2: "🥈", 3: "🥉" };

document.addEventListener("DOMContentLoaded", async () => {
  await requireSession();
  const game = await renderNav("/resultados.html");
  await loadResults(game);
});

async function loadResults(game) {
  const container = document.getElementById("results-container");

  if (!game.closed) {
    const card = document.createElement("section");
    card.className = "card";
    const text = document.createElement("p");
    text.textContent = game.ends_at
      ? "El podio aparece cuando cierre el juego. ¡Todavía hay tiempo para votar!"
      : "El podio aparece cuando el juego cierre.";
    card.appendChild(text);
    container.replaceChildren(card);
    return;
  }

  const [rankingRes, highlightsRes] = await Promise.all([
    apiFetch("/api/boards/ranking"),
    apiFetch("/api/boards/highlights"),
  ]);
  const ranking = await rankingRes.json();
  const allHighlights = await highlightsRes.json();

  // Los empatados comparten puesto: el puesto es 1 + cuántos murales tienen más votos
  const ranked = ranking.map((entry) => ({
    ...entry,
    place: 1 + ranking.filter((other) => other.vote_count > entry.vote_count).length,
  }));
  const podium = ranked.filter((entry) => entry.place <= 3 && entry.vote_count > 0);
  const rest = ranked.filter((entry) => !podium.includes(entry));

  container.replaceChildren();

  if (podium.length === 0) {
    const card = document.createElement("section");
    card.className = "card";
    const text = document.createElement("p");
    text.textContent = "Nadie votó por un mural, así que no hay podio.";
    card.appendChild(text);
    container.appendChild(card);
  }

  for (const entry of podium) {
    const highlights = (allHighlights[entry.board_id] || []).filter((h) => h.photo);

    const card = document.createElement("section");
    card.className = `card podium-card podium-${entry.place}`;

    const title = document.createElement("h2");
    title.textContent = `${MEDALS[entry.place]} ${entry.board_name}`;
    card.appendChild(title);

    const votes = document.createElement("p");
    votes.className = "podium-votes";
    votes.textContent = voteCountLabel(entry.vote_count);
    card.appendChild(votes);

    if (highlights.length > 0) {
      card.appendChild(renderCorkboard(highlights));
      card.appendChild(stripDownloadButton(entry.board_name, highlights));
    }
    container.appendChild(card);
  }

  if (rest.length > 0) {
    const card = document.createElement("section");
    card.className = "card";
    const title = document.createElement("h2");
    title.textContent = "El resto";
    card.appendChild(title);

    const list = document.createElement("ul");
    for (const entry of rest) {
      const li = document.createElement("li");
      li.textContent = `${entry.place}. ${entry.board_name} · ${voteCountLabel(entry.vote_count)}`;
      list.appendChild(li);
    }
    card.appendChild(list);
    container.appendChild(card);
  }
}
